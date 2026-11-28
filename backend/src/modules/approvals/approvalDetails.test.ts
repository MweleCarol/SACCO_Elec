import { prisma } from "../../config/prisma";
import { api, bearer, createElection, createUser, waitFor } from "../../../tests/helpers";

type U = { id: string; role: "ELECTION_OFFICER" | "ELECTION_ADMINISTRATOR" | "MEMBER" | "AUDITOR" };
const day = 864e5;

// An officer asks to reschedule an announced election: a real pending request.
async function pendingReschedule(name = "Board 2027") {
  const officer = await createUser("ELECTION_OFFICER", { fullName: "Otieno Officer" });
  const o2 = await createUser("ELECTION_OFFICER", { fullName: "Wambui Officer" });
  const admin = await createUser("ELECTION_ADMINISTRATOR", { fullName: "Achieng Admin" });
  const e = await createElection(officer.id, { status: "APPROVED", approvedAt: new Date(), name });
  const res = await api()
    .post(`/api/v1/elections/${e.id}/reschedule`).set(bearer(officer))
    .send({ startDate: new Date(Date.now() + 5 * day), endDate: new Date(Date.now() + 6 * day) });
  return { officer, o2, admin, e, id: res.body.data.id as string };
}
const decide = (u: U, id: string, body: object) => api().post(`/api/v1/approval-requests/${id}/decide`).set(bearer(u)).send(body);

describe("approval requests show who asked, for what, and who decided", () => {
  it("lists include the election, the requester and each decision with its comment", async () => {
    const { o2, admin, e, id } = await pendingReschedule();
    await decide(o2, id, { decision: "APPROVE", comment: "Dates agreed at the board meeting." });

    const auditor = await createUser("AUDITOR");
    const res = await api().get("/api/v1/approval-requests?open=true").set(bearer(auditor));
    expect(res.status).toBe(200);
    const r = res.body.data.requests.find((x: { id: string }) => x.id === id);
    expect(r).toMatchObject({
      election: { id: e.id, name: "Board 2027", status: "APPROVED" },
      requestedBy: { fullName: "Otieno Officer", role: "ELECTION_OFFICER" },
      approveCount: 1,
      rejectCount: 0,
      decisions: [{ approverId: o2.id, approverName: "Wambui Officer", approverRole: "ELECTION_OFFICER", decision: "APPROVE", comment: "Dates agreed at the board meeting." }],
    });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|totpSecret|email/);

    const one = await api().get(`/api/v1/approval-requests/${id}`).set(bearer(admin));
    expect(one.body.data.decisions).toHaveLength(1);
  });

  it("open=true lists waiting requests soonest-expiring first; open=false lists the rest", async () => {
    const a = await pendingReschedule("First");
    const b = await pendingReschedule("Second");
    await prisma.approvalRequest.update({ where: { id: b.id }, data: { expiresAt: new Date(Date.now() + day) } });
    const auditor = await createUser("AUDITOR");

    const open = (await api().get("/api/v1/approval-requests?open=true").set(bearer(auditor))).body.data.requests;
    expect(open.map((r: { id: string }) => r.id).slice(0, 2)).toEqual([b.id, a.id]);

    await decide(a.admin, a.id, { decision: "REJECT", comment: "Clashes with the AGM date." });
    const closed = (await api().get("/api/v1/approval-requests?open=false").set(bearer(auditor))).body.data.requests;
    expect(closed.map((r: { id: string }) => r.id)).toContain(a.id);
    expect(closed.every((r: { status: string }) => r.status !== "PENDING")).toBe(true);
    expect((await api().get("/api/v1/approval-requests?open=maybe").set(bearer(auditor))).status).toBe(422);
  });
});

describe("rejecting", () => {
  it("needs a reason of at least 10 characters; the requester is told who rejected and why", async () => {
    const { officer, admin, id } = await pendingReschedule("Delegates 2027");
    expect((await decide(admin, id, { decision: "REJECT" })).status).toBe(422);
    const short = await decide(admin, id, { decision: "REJECT", comment: "No." });
    expect(short.status).toBe(422);
    expect(short.body.errors[0]).toMatchObject({ field: "comment" });

    const res = await decide(admin, id, { decision: "REJECT", comment: "Clashes with the AGM date." });
    expect(res.body.data.status).toBe("REJECTED");
    const note = await waitFor(
      () => prisma.notification.findFirst({ where: { userId: officer.id, type: "APPROVAL_DECIDED" } }),
      (n) => n !== null
    );
    expect(note!.message).toBe(
      'Your request to change the voting dates for "Delegates 2027" was rejected by Achieng Admin. Reason: Clashes with the AGM date.'
    );
  });

  it("approving needs no comment, and the requester hears when it is carried out", async () => {
    const { officer, o2, admin, id } = await pendingReschedule("Delegates 2028");
    await decide(o2, id, { decision: "APPROVE" });
    expect((await decide(admin, id, { decision: "APPROVE" })).body.data.status).toBe("EXECUTED");
    const note = await waitFor(
      () => prisma.notification.findFirst({ where: { userId: officer.id, type: "APPROVAL_DECIDED" } }),
      (n) => n !== null
    );
    expect(note!.message).toContain('change the voting dates for "Delegates 2028" got enough approvals');
  });
});