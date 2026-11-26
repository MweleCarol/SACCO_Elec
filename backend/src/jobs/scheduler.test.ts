import { prisma } from "../config/prisma";
import { runScheduledTasks, startScheduler } from "./scheduler";
import {
  addReadyBallot,
  api,
  bearer,
  createElection,
  createOpenElection,
  createUser,
  waitFor,
} from "../../tests/helpers";

const past = (ms: number) => new Date(Date.now() - ms);
const HOUR = 3600_000;

async function endedActiveElection(officerId: string) {
  return createElection(officerId, {
    status: "ACTIVE",
    startDate: past(3 * HOUR),
    endDate: past(HOUR),
    approvedAt: past(4 * HOUR),
  });
}

describe("auto-close", () => {
  it("closes an ACTIVE election past its end date, audits it as a system action, and notifies active members", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const member = await createUser("MEMBER");
    const suspended = await createUser("MEMBER", { status: "SUSPENDED" });
    const e = await endedActiveElection(officer.id);

    const result = await runScheduledTasks();
    expect(result.electionsClosed).toEqual([e.id]);

    const row = await prisma.election.findUniqueOrThrow({
      where: { id: e.id },
    });
    expect(row.status).toBe("CLOSED");
    expect(row.closedAt).not.toBeNull();

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { action: "ELECTION_CLOSED", electionId: e.id },
    });
    expect(log.actorId).toBeNull();
    expect(log.metadata).toMatchObject({ trigger: "SCHEDULED" });

    await waitFor(
      () => prisma.notification.count({ where: { type: "ELECTION_CLOSED" } }),
      (c) => c > 0,
    );
    expect(
      await prisma.notification.count({
        where: { userId: member.id, type: "ELECTION_CLOSED" },
      }),
    ).toBe(1);
    expect(
      await prisma.notification.count({ where: { userId: suspended.id } }),
    ).toBe(0);
    expect(
      await prisma.notification.count({ where: { userId: officer.id } }),
    ).toBe(0);
  });

  it("leaves open, not-yet-active and already-closed elections alone", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const { election: open } = await createOpenElection(officer.id); // ends in an hour
    const approvedPastEnd = await createElection(officer.id, {
      status: "APPROVED",
      startDate: past(3 * HOUR),
      endDate: past(HOUR),
    });
    const closed = await createElection(officer.id, {
      status: "CLOSED",
      startDate: past(3 * HOUR),
      endDate: past(HOUR),
    });

    expect((await runScheduledTasks()).electionsClosed).toEqual([]);
    for (const [e, status] of [
      [open, "ACTIVE"],
      [approvedPastEnd, "APPROVED"],
      [closed, "CLOSED"],
    ] as const) {
      expect(
        (await prisma.election.findUniqueOrThrow({ where: { id: e.id } }))
          .status,
      ).toBe(status);
    }
    expect(
      await prisma.auditLog.count({ where: { action: "ELECTION_CLOSED" } }),
    ).toBe(0);
  });

  it("is idempotent: a second pass closes nothing and writes no second audit row", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    await endedActiveElection(officer.id);
    await runScheduledTasks();
    expect((await runScheduledTasks()).electionsClosed).toEqual([]);
    expect(
      await prisma.auditLog.count({ where: { action: "ELECTION_CLOSED" } }),
    ).toBe(1);
  });

  it("does nothing if an officer closed the election first", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const e = await endedActiveElection(officer.id);
    expect(
      (await api().post(`/api/v1/elections/${e.id}/close`).set(bearer(officer)))
        .status,
    ).toBe(200);
    expect((await runScheduledTasks()).electionsClosed).toEqual([]);
    const logs = await prisma.auditLog.findMany({
      where: { action: "ELECTION_CLOSED" },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].metadata).toMatchObject({ trigger: "MANUAL" });
  });

  it("a manual close notifies members too", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const member = await createUser("MEMBER");
    const e = await createElection(officer.id, { status: "ACTIVE" });
    await api().post(`/api/v1/elections/${e.id}/close`).set(bearer(officer));
    const n = await waitFor(
      () =>
        prisma.notification.count({
          where: { userId: member.id, type: "ELECTION_CLOSED" },
        }),
      (c) => c > 0,
    );
    expect(n).toBe(1);
  });

  it("after an auto-close, officers can tally straight away", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const fx = await createOpenElection(officer.id);
    await api()
      .post(`/api/v1/elections/${fx.election.id}/ballot`)
      .set(bearer(await createUser("MEMBER")))
      .send({
        selections: [
          { positionId: fx.chair.id, candidateId: fx.chairA.id },
          { positionId: fx.treasurer.id, candidateId: fx.treasA.id },
        ],
      });
    await prisma.election.update({
      where: { id: fx.election.id },
      data: { endDate: past(1000) },
    });

    await runScheduledTasks();
    expect(
      (
        await api()
          .post(`/api/v1/elections/${fx.election.id}/results/tally`)
          .set(bearer(officer))
      ).status,
    ).toBe(200);
  });
});

describe("approval request expiry", () => {
  it("marks every expired PENDING request EXPIRED, audits each, and leaves live ones alone", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const e1 = await createElection(officer.id, { status: "APPROVED" });
    const e2 = await createElection(officer.id, { status: "APPROVED" });
    const ids: string[] = [];
    for (const e of [e1, e2]) {
      await addReadyBallot(e.id);
      ids.push(
        (
          await api()
            .post(`/api/v1/elections/${e.id}/activate`)
            .set(bearer(officer))
        ).body.data.id,
      );
    }
    await prisma.approvalRequest.update({
      where: { id: ids[0] },
      data: { expiresAt: past(1000) },
    });

    expect((await runScheduledTasks()).approvalRequestsExpired).toBe(1);
    expect(
      (
        await prisma.approvalRequest.findUniqueOrThrow({
          where: { id: ids[0] },
        })
      ).status,
    ).toBe("EXPIRED");
    expect(
      (
        await prisma.approvalRequest.findUniqueOrThrow({
          where: { id: ids[1] },
        })
      ).status,
    ).toBe("PENDING");
    const log = await prisma.auditLog.findFirstOrThrow({
      where: { action: "APPROVAL_EXPIRED" },
    });
    expect(log.metadata).toMatchObject({
      approvalRequestId: ids[0],
      trigger: "SCHEDULED",
    });
  });
});
describe("startScheduler", () => {
  it("runs a pass immediately on start, and stop() waits for it to finish", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const member = await createUser("MEMBER");
    const e = await endedActiveElection(officer.id);

    const stop = startScheduler(60_000);
    await stop(); // returns only once the first pass is completely done

    expect(
      (await prisma.election.findUniqueOrThrow({ where: { id: e.id } })).status,
    ).toBe("CLOSED");
    expect(
      await prisma.auditLog.count({
        where: { action: "ELECTION_CLOSED", electionId: e.id },
      }),
    ).toBe(1);
    // The member notification is fire-and-forget; wait for it so nothing is
    // still writing when the next test resets the database.
    const n = await waitFor(
      () => prisma.notification.count({ where: { userId: member.id } }),
      (c) => c > 0,
    );
    expect(n).toBe(1);
  });
});
