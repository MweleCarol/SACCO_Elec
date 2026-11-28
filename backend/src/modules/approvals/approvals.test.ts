import { prisma } from "../../config/prisma";
import * as auditService from "../audit/audit.service";
import {
  addReadyBallot,
  api,
  bearer,
  createElection,
  createUser,
  waitFor,
} from "../../../tests/helpers";

type Actor = {
  id: string;
  role: "ELECTION_OFFICER" | "ELECTION_ADMINISTRATOR" | "MEMBER" | "AUDITOR";
};

async function setup(
  requiredApprovals = 2,
  status: "APPROVED" | "CLOSED" = "APPROVED",
) {
  const requester = await createUser("ELECTION_OFFICER");
  const o2 = await createUser("ELECTION_OFFICER");
  const o3 = await createUser("ELECTION_OFFICER");
  const admin = await createUser("ELECTION_ADMINISTRATOR");
  const election = await createElection(requester.id, {
    status,
    requiredApprovals,
  });
  if (status === "APPROVED") await addReadyBallot(election.id);
  return { requester, o2, o3, admin, election };
}

const decide = (user: Actor, id: string, decision: "APPROVE" | "REJECT") =>
  api().post(`/api/v1/approval-requests/${id}/decide`).set(bearer(user as never))
    // A rejection must give a reason (10+ characters).
    .send(decision === "REJECT" ? { decision, comment: "Not ready yet: see the notes." } : { decision });

async function requestActivation(
  requester: { id: string },
  electionId: string,
) {
  const res = await api()
    .post(`/api/v1/elections/${electionId}/activate`)
    .set(bearer({ id: requester.id, role: "ELECTION_OFFICER" }));
  expect(res.status).toBe(200);
  return res.body.data.id as string;
}

describe("DAT quorum and veto", () => {
  it("N distinct approvers activate the election; the request ends EXECUTED", async () => {
    const { requester, o2, admin, election } = await setup(2);
    const reqId = await requestActivation(requester, election.id);

    // A second activate call reuses the pending request rather than opening another.
    expect(await requestActivation(requester, election.id)).toBe(reqId);

    const first = await decide(o2, reqId, "APPROVE");
    expect(first.body.data).toMatchObject({
      status: "PENDING",
      approveCount: 1,
    });
    const second = await decide(admin, reqId, "APPROVE");
    expect(second.body.data).toMatchObject({
      status: "EXECUTED",
      approveCount: 2,
    });
    expect(second.body.data.executedAt).not.toBeNull();

    const e = await prisma.election.findUniqueOrThrow({
      where: { id: election.id },
    });
    expect(e.status).toBe("ACTIVE");
    expect(e.activatedAt).not.toBeNull();
    expect(
      await prisma.auditLog.count({
        where: { action: { in: ["ELECTION_ACTIVATED", "APPROVAL_EXECUTED"] } },
      }),
    ).toBe(2);

    // Activating again is an invalid transition now.
    expect(
      (
        await api()
          .post(`/api/v1/elections/${election.id}/activate`)
          .set(bearer(requester))
      ).status,
    ).toBe(409);
  });

  it("blocks self-approval, duplicate decisions, decisions on resolved requests, and non-officer roles", async () => {
    const { requester, o2, o3, election } = await setup(3);
    const reqId = await requestActivation(requester, election.id);

    expect((await decide(requester, reqId, "APPROVE")).status).toBe(403);
    expect((await decide(o2, reqId, "APPROVE")).status).toBe(200);
    expect((await decide(o2, reqId, "APPROVE")).status).toBe(409);
    expect(
      (await decide(await createUser("AUDITOR"), reqId, "APPROVE")).status,
    ).toBe(403);
    expect(
      (await decide(await createUser("MEMBER"), reqId, "APPROVE")).status,
    ).toBe(403);

    await decide(o3, reqId, "REJECT");
    expect(
      (await decide(await createUser("ELECTION_OFFICER"), reqId, "APPROVE"))
        .status,
    ).toBe(409);
  });

  it("a single REJECT vetoes immediately, leaves the election unchanged, and a new request can be made", async () => {
    const { requester, o2, o3, election } = await setup(2);
    const reqId = await requestActivation(requester, election.id);
    await decide(o2, reqId, "APPROVE");
    const veto = await decide(o3, reqId, "REJECT");
    expect(veto.body.data.status).toBe("REJECTED");
    expect(
      (await prisma.election.findUniqueOrThrow({ where: { id: election.id } }))
        .status,
    ).toBe("APPROVED");

    const again = await requestActivation(requester, election.id);
    expect(again).not.toBe(reqId);

    // The requester is told the outcome.
    const n = await waitFor(
      () =>
        prisma.notification.count({
          where: { userId: requester.id, type: "APPROVAL_DECIDED" },
        }),
      (c) => c >= 1,
    );
    expect(n).toBe(1);
  });

  it("concurrent final approvals execute the action exactly once", async () => {
    const { requester, o2, o3, admin, election } = await setup(2);
    const reqId = await requestActivation(requester, election.id);
    await decide(o2, reqId, "APPROVE");
    await Promise.all([
      decide(o3, reqId, "APPROVE"),
      decide(admin, reqId, "APPROVE"),
    ]);
    expect(
      await prisma.auditLog.count({ where: { action: "ELECTION_ACTIVATED" } }),
    ).toBe(1);
    expect(
      (await prisma.approvalRequest.findUniqueOrThrow({ where: { id: reqId } }))
        .status,
    ).toBe("EXECUTED");
  });

  it("lists requests with tallies for officers, admins and auditors only", async () => {
    const { requester, o2, election } = await setup(2);
    const reqId = await requestActivation(requester, election.id);
    await decide(o2, reqId, "APPROVE");
    const res = await api()
      .get("/api/v1/approval-requests?status=PENDING")
      .set(bearer(await createUser("AUDITOR")));
    expect(res.status).toBe(200);
    expect(res.body.data.requests[0]).toMatchObject({
      id: reqId,
      approveCount: 1,
      rejectCount: 0,
    });
    expect(
      (await api().get(`/api/v1/approval-requests/${reqId}`).set(bearer(o2)))
        .body.data.id,
    ).toBe(reqId);
    expect(
      (
        await api()
          .get("/api/v1/approval-requests")
          .set(bearer(await createUser("MEMBER")))
      ).status,
    ).toBe(403);
  });
});

describe("cancellation and reschedule through DAT", () => {
  it("cancellation archives the election; a second cancel is a conflict", async () => {
    const { admin, o2, o3, election } = await setup(2);
    const res = await api()
      .post(`/api/v1/elections/${election.id}/cancel`)
      .set(bearer(admin))
      .send({ reason: "Board decision" });
    const reqId = res.body.data.id;
    await decide(o2, reqId, "APPROVE");
    expect((await decide(o3, reqId, "APPROVE")).body.data.status).toBe(
      "EXECUTED",
    );
    const e = await prisma.election.findUniqueOrThrow({
      where: { id: election.id },
    });
    expect(e.status).toBe("ARCHIVED");
    expect(e.archivedAt).not.toBeNull();
    const log = await prisma.auditLog.findFirstOrThrow({
      where: { action: "ELECTION_CANCELLED" },
    });
    expect(log.metadata).toEqual({ reason: "Board decision", previousStatus: election.status });
    expect(e.cancelledAt).not.toBeNull();
    expect(e.cancellationReason).toBe("Board decision");
    expect(
      (
        await api()
          .post(`/api/v1/elections/${election.id}/cancel`)
          .set(bearer(admin))
          .send({ reason: "Board decision" })
      ).status,
    ).toBe(409);
  });

  it("reschedule changes the dates once approved", async () => {
    const { requester, o2, o3, election } = await setup(2);
    const startDate = new Date(Date.now() + 5 * 864e5);
    const endDate = new Date(Date.now() + 6 * 864e5);
    const res = await api()
      .post(`/api/v1/elections/${election.id}/reschedule`)
      .set(bearer(requester))
      .send({ startDate, endDate });
    await decide(o2, res.body.data.id, "APPROVE");
    await decide(o3, res.body.data.id, "APPROVE");
    const e = await prisma.election.findUniqueOrThrow({
      where: { id: election.id },
    });
    expect(e.startDate.toISOString()).toBe(startDate.toISOString());
    expect(e.endDate.toISOString()).toBe(endDate.toISOString());
    expect(e.status).toBe("APPROVED");
  });

  it("an ACTIVE election cannot be rescheduled", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const e = await createElection(officer.id, { status: "ACTIVE" });
    const res = await api()
      .post(`/api/v1/elections/${e.id}/reschedule`)
      .set(bearer(officer))
      .send({
        startDate: new Date(Date.now() + 864e5),
        endDate: new Date(Date.now() + 2 * 864e5),
      });
    expect(res.status).toBe(409);
  });
});

// K1: an expired PENDING request used to be reused forever by requestApproval
// while decide() refused it, so the action was blocked for that election.
describe("expired requests (K1)", () => {
  it("an expired request is marked EXPIRED and a fresh request is created", async () => {
    const { requester, o2, o3, election } = await setup(2);
    const oldId = await requestActivation(requester, election.id);
    await prisma.approvalRequest.update({
      where: { id: oldId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const newId = await requestActivation(requester, election.id);
    expect(newId).not.toBe(oldId);
    expect(
      (await prisma.approvalRequest.findUniqueOrThrow({ where: { id: oldId } }))
        .status,
    ).toBe("EXPIRED");
    expect(
      await prisma.auditLog.count({ where: { action: "APPROVAL_EXPIRED" } }),
    ).toBe(1);

    await decide(o2, newId, "APPROVE");
    expect((await decide(o3, newId, "APPROVE")).body.data.status).toBe(
      "EXECUTED",
    );
  });

  it("deciding on an expired request is a 409 and records the expiry", async () => {
    const { requester, o2, election } = await setup(2);
    const reqId = await requestActivation(requester, election.id);
    await prisma.approvalRequest.update({
      where: { id: reqId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const res = await decide(o2, reqId, "APPROVE");
    expect(res.status).toBe(409);
    expect(
      (await prisma.approvalRequest.findUniqueOrThrow({ where: { id: reqId } }))
        .status,
    ).toBe("EXPIRED");
    expect(await prisma.approvalDecision.count()).toBe(0);
  });
});

describe("fail-closed audit", () => {
  it("if the audit write fails, the whole activation rolls back and a later approver can still complete it", async () => {
    const { requester, o2, o3, admin, election } = await setup(2);
    const reqId = await requestActivation(requester, election.id);
    await decide(o2, reqId, "APPROVE");

    const real = auditService.writeAuditLogInTransaction;
    const spy = jest
      .spyOn(auditService, "writeAuditLogInTransaction")
      .mockImplementation(async (tx, input) => {
        if (input.action === "ELECTION_ACTIVATED")
          throw new Error("simulated audit failure");
        return real(tx, input);
      });

    const failed = await decide(o3, reqId, "APPROVE");
    expect(failed.status).toBe(500);
    expect(JSON.stringify(failed.body)).not.toMatch(/simulated/);

    const e = await prisma.election.findUniqueOrThrow({
      where: { id: election.id },
    });
    expect(e.status).toBe("APPROVED");
    expect(e.activatedAt).toBeNull();
    const r = await prisma.approvalRequest.findUniqueOrThrow({
      where: { id: reqId },
    });
    expect(r.status).toBe("PENDING");
    expect(r.executedAt).toBeNull();
    expect(
      await prisma.auditLog.count({
        where: { action: { in: ["ELECTION_ACTIVATED", "APPROVAL_EXECUTED"] } },
      }),
    ).toBe(0);
    expect(
      await prisma.notification.count({
        where: { type: "ELECTION_ACTIVATED" },
      }),
    ).toBe(0);

    spy.mockRestore();
    expect((await decide(admin, reqId, "APPROVE")).body.data.status).toBe(
      "EXECUTED",
    );
    expect(
      (await prisma.election.findUniqueOrThrow({ where: { id: election.id } }))
        .status,
    ).toBe("ACTIVE");
  });
});
