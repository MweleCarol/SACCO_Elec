import { prisma } from "../../config/prisma";
import { api, bearer, createElection, createPosition, createUser, waitFor } from "../../../tests/helpers";

const MANIFESTO = "I will push for faster loan approvals and publish the SACCO accounts every quarter.";
const nominate = (electionId: string) => `/api/v1/elections/${electionId}/nominations`;

async function announcedElection(status: "APPROVED" | "SCHEDULED" | "DRAFT" | "ACTIVE" = "APPROVED") {
  const officer = await createUser("ELECTION_OFFICER");
  const election = await createElection(officer.id, { status, approvedAt: status === "DRAFT" ? null : new Date() });
  const chair = await createPosition(election.id, "Chairperson");
  const treasurer = await createPosition(election.id, "Treasurer");
  return { officer, election, chair, treasurer };
}

describe("self-nomination", () => {
  it("a member nominates themselves: pending, their own name, officers notified, officer approves, member notified", async () => {
    const { officer, election, chair } = await announcedElection();
    const member = await createUser("MEMBER", { fullName: "Wanjiru Kamau" });

    const res = await api().post(nominate(election.id)).set(bearer(member)).send({
      positionId: chair.id, manifesto: MANIFESTO, displayName: "Someone Else", memberId: officer.id,
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: "PENDING_REVIEW", displayName: "Wanjiru Kamau", memberId: member.id, positionId: chair.id });

    // Not on the public list until approved.
    const publicList = await api().get(`/api/v1/elections/${election.id}/candidates`).set(bearer(await createUser("MEMBER")));
    expect(publicList.body.data).toHaveLength(0);

    await waitFor(() => prisma.notification.count({ where: { userId: officer.id, title: "New nomination to review" } }), (c) => c === 1);

    // The member sees it under /candidates/mine with context.
    const mine = await api().get("/api/v1/candidates/mine").set(bearer(member));
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(1);
    expect(mine.body.data[0]).toMatchObject({ status: "PENDING_REVIEW", election: { id: election.id }, position: { name: "Chairperson" } });

    const ok = await api().post(`/api/v1/candidates/${res.body.data.id}/approve`).set(bearer(officer)).send({ decision: "APPROVE" });
    expect(ok.body.data.status).toBe("APPROVED");
    await waitFor(
      () => prisma.notification.count({ where: { userId: member.id, type: "CANDIDATE_STATUS_CHANGED", title: "Your nomination was approved" } }),
      (c) => c === 1
    );

    const audit = await prisma.auditLog.findFirst({ where: { resourceId: res.body.data.id, action: "CANDIDATE_REGISTERED" } });
    expect(audit?.actorId).toBe(member.id);
  });

  it("a rejection tells the member the reason", async () => {
    const { officer, election, chair } = await announcedElection("SCHEDULED");
    const member = await createUser("MEMBER");
    const res = await api().post(nominate(election.id)).set(bearer(member)).send({ positionId: chair.id, manifesto: MANIFESTO });
    expect(res.status).toBe(201);
    await api().post(`/api/v1/candidates/${res.body.data.id}/reject`).set(bearer(officer)).send({ decision: "REJECT", comment: "Loan arrears" });
    const n = await waitFor(
      () => prisma.notification.findFirst({ where: { userId: member.id, title: "Your nomination was not approved" } }),
      (v) => v !== null
    );
    expect(n!.message).toContain("Loan arrears");
  });

  it("one nomination per member per election; withdrawing frees them to stand again", async () => {
    const { election, chair, treasurer } = await announcedElection();
    const member = await createUser("MEMBER");
    const first = await api().post(nominate(election.id)).set(bearer(member)).send({ positionId: chair.id, manifesto: MANIFESTO });
    expect(first.status).toBe(201);
    expect((await api().post(nominate(election.id)).set(bearer(member)).send({ positionId: treasurer.id, manifesto: MANIFESTO })).status).toBe(409);

    expect((await api().post(`/api/v1/candidates/${first.body.data.id}/withdraw`).set(bearer(member)).send({})).status).toBe(200);
    expect((await api().post(nominate(election.id)).set(bearer(member)).send({ positionId: treasurer.id, manifesto: MANIFESTO })).status).toBe(201);
  });

  it("two simultaneous submissions create only one nomination", async () => {
    const { election, chair, treasurer } = await announcedElection();
    const member = await createUser("MEMBER");
    const [a, b] = await Promise.all([
      api().post(nominate(election.id)).set(bearer(member)).send({ positionId: chair.id, manifesto: MANIFESTO }),
      api().post(nominate(election.id)).set(bearer(member)).send({ positionId: treasurer.id, manifesto: MANIFESTO }),
    ]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await prisma.candidate.count({ where: { electionId: election.id, memberId: member.id } })).toBe(1);
  });

  it("closed once voting starts, hidden for drafts, and only for active members", async () => {
    const active = await announcedElection("ACTIVE");
    const member = await createUser("MEMBER");
    expect((await api().post(nominate(active.election.id)).set(bearer(member)).send({ positionId: active.chair.id, manifesto: MANIFESTO })).status).toBe(403);

    const draft = await announcedElection("DRAFT");
    expect((await api().post(nominate(draft.election.id)).set(bearer(member)).send({ positionId: draft.chair.id, manifesto: MANIFESTO })).status).toBe(404);

    const open = await announcedElection();
    const suspended = await createUser("MEMBER", { membershipStatus: "SUSPENDED" });
    const res = await api().post(nominate(open.election.id)).set(bearer(suspended)).send({ positionId: open.chair.id, manifesto: MANIFESTO });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/active SACCO membership/);
  });

  it("validates the position and the manifesto, and is for members only", async () => {
    const { officer, election } = await announcedElection();
    const other = await announcedElection();
    const member = await createUser("MEMBER");
    expect((await api().post(nominate(election.id)).set(bearer(member)).send({ positionId: other.chair.id, manifesto: MANIFESTO })).status).toBe(404);
    const short = await api().post(nominate(election.id)).set(bearer(member)).send({ positionId: other.chair.id, manifesto: "Vote me" });
    expect(short.status).toBe(422);
    expect((await api().post(nominate(election.id)).set(bearer(officer)).send({ positionId: other.chair.id, manifesto: MANIFESTO })).status).toBe(403);
    expect((await api().get("/api/v1/candidates/mine").set(bearer(officer))).status).toBe(403);
  });

  it("/candidates/mine lists only the caller's own nominations", async () => {
    const { election, chair } = await announcedElection();
    const a = await createUser("MEMBER");
    const b = await createUser("MEMBER");
    await api().post(nominate(election.id)).set(bearer(a)).send({ positionId: chair.id, manifesto: MANIFESTO });
    expect((await api().get("/api/v1/candidates/mine").set(bearer(b))).body.data).toEqual([]);
  });
});