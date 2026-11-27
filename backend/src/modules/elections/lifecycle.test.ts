import { prisma } from "../../config/prisma";
import { api, bearer, createCandidate, createElection, createPosition, createUser, waitFor } from "../../../tests/helpers";

type Staff = { id: string; role: "ELECTION_OFFICER" | "ELECTION_ADMINISTRATOR" | "MEMBER" | "AUDITOR" };
const day = 864e5;
const decide = (user: Staff, id: string, decision: "APPROVE" | "REJECT") =>
  api().post(`/api/v1/approval-requests/${id}/decide`).set(bearer(user)).send({ decision });

async function team() {
  const officer = await createUser("ELECTION_OFFICER");
  const o2 = await createUser("ELECTION_OFFICER");
  const admin = await createUser("ELECTION_ADMINISTRATOR");
  const member = await createUser("MEMBER");
  return { officer, o2, admin, member };
}

const announced = (createdById: string, status: "APPROVED" | "SCHEDULED" = "APPROVED") =>
  createElection(createdById, { status, approvedAt: new Date() });

describe("rescheduling (officer request, needs approval)", () => {
  const reschedule = (u: Staff, id: string, startDate: Date, endDate: Date) =>
    api().post(`/api/v1/elections/${id}/reschedule`).set(bearer(u)).send({ startDate, endDate });

  it("refuses drafts, past starts, unchanged dates and a second pending request", async () => {
    const { officer } = await team();
    const draft = await createElection(officer.id);
    const res = await reschedule(officer, draft.id, new Date(Date.now() + 3 * day), new Date(Date.now() + 4 * day));
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Edit its dates/);

    const e = await announced(officer.id);
    const past = await reschedule(officer, e.id, new Date(Date.now() - 1000), new Date(Date.now() + day));
    expect(past.status).toBe(422);
    expect(past.body.errors[0]).toMatchObject({ field: "startDate" });
    expect((await reschedule(officer, e.id, e.startDate, e.endDate)).status).toBe(422);

    expect((await reschedule(officer, e.id, new Date(Date.now() + 3 * day), new Date(Date.now() + 4 * day))).status).toBe(200);
    const again = await reschedule(officer, e.id, new Date(Date.now() + 5 * day), new Date(Date.now() + 6 * day));
    expect(again.status).toBe(409);
    expect(again.body.message).toMatch(/already waiting for approval/);
  });

  it("tells approvers, keeps the old dates for them, and tells members the new dates once approved", async () => {
    const { officer, o2, admin, member } = await team();
    const e = await createElection(officer.id, { status: "SCHEDULED", approvedAt: new Date(), requiredApprovals: 2, name: "Board 2027" });
    const start = new Date(Date.now() + 10 * day);
    const end = new Date(Date.now() + 11 * day);
    const req = await reschedule(officer, e.id, start, end);
    expect(req.body.data.payload).toMatchObject({
      startDate: start.toISOString(), endDate: end.toISOString(),
      previousStartDate: e.startDate.toISOString(), previousEndDate: e.endDate.toISOString(),
    });

    // Approvers (other officers, administrators) are told; the requester and members are not.
    await waitFor(() => prisma.notification.count({ where: { type: "APPROVAL_REQUESTED", userId: o2.id } }), (c) => c === 1);
    expect(await prisma.notification.count({ where: { type: "APPROVAL_REQUESTED", userId: admin.id } })).toBe(1);
    expect(await prisma.notification.count({ where: { type: "APPROVAL_REQUESTED", userId: { in: [officer.id, member.id] } } })).toBe(0);

    await decide(o2, req.body.data.id, "APPROVE");
    expect((await decide(admin, req.body.data.id, "APPROVE")).body.data.status).toBe("EXECUTED");

    const after = await prisma.election.findUniqueOrThrow({ where: { id: e.id } });
    expect(after.startDate.toISOString()).toBe(start.toISOString());
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "ELECTION_RESCHEDULED", electionId: e.id } });
    expect(log.metadata).toMatchObject({ from: { startDate: e.startDate.toISOString() }, to: { startDate: start.toISOString() } });
    const note = await waitFor(
      () => prisma.notification.findFirst({ where: { userId: member.id, title: "New election dates" } }),
      (n) => n !== null
    );
    expect(note!.message).toContain("Board 2027");
  });

  it("refuses to apply dates whose start passed while waiting for approval", async () => {
    const { officer, o2, admin } = await team();
    const e = await announced(officer.id);
    const req = await reschedule(officer, e.id, new Date(Date.now() + 3 * day), new Date(Date.now() + 4 * day));
    const id = req.body.data.id;
    const payload = req.body.data.payload as Record<string, string>;
    await prisma.approvalRequest.update({
      where: { id },
      data: { payload: { ...payload, startDate: new Date(Date.now() - 60_000).toISOString() } },
    });
    await decide(o2, id, "APPROVE");
    const res = await decide(admin, id, "APPROVE");
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already passed/);
    expect((await prisma.election.findUniqueOrThrow({ where: { id: e.id } })).startDate.toISOString()).toBe(e.startDate.toISOString());
  });
});

describe("cancelling (administrator request, needs approval)", () => {
  const cancel = (u: Staff, id: string, reason: string) =>
    api().post(`/api/v1/elections/${id}/cancel`).set(bearer(u)).send({ reason });

  it("only before voting starts, with a real reason, one request at a time", async () => {
    const { officer, admin } = await team();
    const active = await createElection(officer.id, { status: "ACTIVE", approvedAt: new Date() });
    const res = await cancel(admin, active.id, "The board has decided to stop this.");
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/close the election instead/);

    const pending = await createElection(officer.id, { status: "PENDING_APPROVAL" });
    expect((await cancel(admin, pending.id, "Not needed any more.")).body.message).toMatch(/Send it back to draft/);

    const e = await announced(officer.id);
    expect((await cancel(admin, e.id, "Too short")).status).toBe(422);
    expect((await cancel(admin, e.id, "Merged with the annual general meeting.")).status).toBe(200);
    expect((await cancel(admin, e.id, "Merged with the annual general meeting.")).status).toBe(409);
    expect((await cancel(officer, e.id, "Officers cannot ask for this.")).status).toBe(403);
  });

  it("once approved: archived, marked cancelled with the reason, members told", async () => {
    const { officer, o2, admin, member } = await team();
    const e = await announced(officer.id);
    const reason = "Merged with the annual general meeting.";
    const req = await cancel(admin, e.id, reason);
    await decide(officer, req.body.data.id, "APPROVE");
    expect((await decide(o2, req.body.data.id, "APPROVE")).body.data.status).toBe("EXECUTED");

    const view = await api().get(`/api/v1/elections/${e.id}`).set(bearer(member));
    expect(view.status).toBe(200);
    expect(view.body.data).toMatchObject({ status: "ARCHIVED", cancellationReason: reason });
    expect(view.body.data.cancelledAt).not.toBeNull();
    const note = await waitFor(
      () => prisma.notification.findFirst({ where: { userId: member.id, title: "Election cancelled" } }),
      (n) => n !== null
    );
    expect(note!.message).toContain(reason);
  });

  it("a cancelled draft stays hidden from members and sends them nothing", async () => {
    const { officer, o2, admin, member } = await team();
    const draft = await createElection(officer.id);
    const req = await cancel(admin, draft.id, "Created by mistake, not needed.");
    await decide(officer, req.body.data.id, "APPROVE");
    await decide(o2, req.body.data.id, "APPROVE");
    expect((await prisma.election.findUniqueOrThrow({ where: { id: draft.id } })).cancelledAt).not.toBeNull();
    expect((await api().get(`/api/v1/elections/${draft.id}`).set(bearer(member))).status).toBe(404);
    await new Promise((r) => setTimeout(r, 200));
    expect(await prisma.notification.count({ where: { userId: member.id, title: "Election cancelled" } })).toBe(0);
  });

  it("is refused if voting started while the request was waiting", async () => {
    const { officer, o2, admin } = await team();
    const e = await announced(officer.id);
    const req = await cancel(admin, e.id, "Merged with the annual general meeting.");
    await prisma.election.update({ where: { id: e.id }, data: { status: "ACTIVE" } });
    await decide(officer, req.body.data.id, "APPROVE");
    const res = await decide(o2, req.body.data.id, "APPROVE");
    expect(res.status).toBe(409);
    expect((await prisma.election.findUniqueOrThrow({ where: { id: e.id } })).status).toBe("ACTIVE");
  });
});

describe("withdrawing a candidate", () => {
  async function candidacy(electionStatus: "APPROVED" | "ACTIVE" = "APPROVED") {
    const t = await team();
    const e = await createElection(t.officer.id, { status: electionStatus, approvedAt: new Date() });
    const p = await createPosition(e.id, "Chairperson");
    const c = await createCandidate(e.id, p.id, "APPROVED", "Wanjiru Kamau");
    await prisma.candidate.update({ where: { id: c.id }, data: { memberId: t.member.id } });
    return { ...t, e, c };
  }
  const withdraw = (u: Staff, id: string, reason?: string) =>
    api().post(`/api/v1/candidates/${id}/withdraw`).set(bearer(u)).send(reason === undefined ? {} : { reason });

  it("an officer must give a reason, and the member is told it", async () => {
    const { officer, member, c } = await candidacy();
    expect((await withdraw(officer, c.id)).status).toBe(422);
    expect((await withdraw(officer, c.id, "Too short")).status).toBe(422);
    const reason = "Not eligible: membership lapsed in October.";
    const res = await withdraw(officer, c.id, reason);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("WITHDRAWN");
    const note = await waitFor(
      () => prisma.notification.findFirst({ where: { userId: member.id, title: "Your candidacy was withdrawn" } }),
      (n) => n !== null
    );
    expect(note!.message).toContain(reason);
    expect((await withdraw(officer, c.id, reason)).status).toBe(409);
  });

  it("a member can withdraw themselves without a reason; officers are told", async () => {
    const { officer, member, c } = await candidacy();
    expect((await withdraw(member, c.id)).status).toBe(200);
    await waitFor(
      () => prisma.notification.count({ where: { userId: officer.id, title: "A candidate withdrew" } }),
      (n) => n === 1
    );
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "CANDIDATE_WITHDRAWN", resourceId: c.id } });
    expect(log.metadata).toMatchObject({ selfWithdrawn: true, previousStatus: "APPROVED" });
  });

  it("nobody else can, and not once voting has started", async () => {
    const { admin, c } = await candidacy();
    const other = await createUser("MEMBER");
    expect((await withdraw(other, c.id)).status).toBe(403);
    expect((await withdraw(admin, c.id, "Administrators cannot do this.")).status).toBe(403);

    const live = await candidacy("ACTIVE");
    expect((await withdraw(live.officer, live.c.id, "Voting has started already.")).status).toBe(403);
  });
});