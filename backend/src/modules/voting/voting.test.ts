import { prisma } from "../../config/prisma";
import { decryptPayload } from "../../shared/utils/crypto";
import { api, bearer, createCandidate, createOpenElection, createUser } from "../../../tests/helpers";

async function setupOpen() {
  const officer = await createUser("ELECTION_OFFICER");
  const member = await createUser("MEMBER");
  const fx = await createOpenElection(officer.id);
  const selections = [
    { positionId: fx.chair.id, candidateId: fx.chairA.id },
    { positionId: fx.treasurer.id, candidateId: fx.treasB.id },
  ];
  return { officer, member, ...fx, selections };
}

const ballotUrl = (id: string) => `/api/v1/elections/${id}/ballot`;

describe("ballot", () => {
  it("shows positions in order with APPROVED candidates only", async () => {
    const { member, election, chair } = await setupOpen();
    await createCandidate(election.id, chair.id, "PENDING_REVIEW", "Pending Pat");
    await createCandidate(election.id, chair.id, "REJECTED", "Rejected Ray");
    const res = await api().get(ballotUrl(election.id)).set(bearer(member));
    expect(res.status).toBe(200);
    expect(res.body.data.positions.map((p: { name: string }) => p.name)).toEqual(["Chairperson", "Treasurer"]);
    const names = res.body.data.positions[0].candidates.map((c: { displayName: string }) => c.displayName).sort();
    expect(names).toEqual(["Alice", "Bob"]);
  });

  it("only members can fetch or submit a ballot", async () => {
    const { election, selections } = await setupOpen();
    for (const role of ["ELECTION_OFFICER", "ELECTION_ADMINISTRATOR", "AUDITOR"] as const) {
      const u = await createUser(role);
      expect((await api().get(ballotUrl(election.id)).set(bearer(u))).status).toBe(403);
      expect((await api().post(ballotUrl(election.id)).set(bearer(u)).send({ selections })).status).toBe(403);
    }
  });
});

describe("casting a vote", () => {
  it("records participation and anonymous, encrypted votes with a constant timestamp", async () => {
    const { member, election, selections, chairA } = await setupOpen();
    const res = await api().post(ballotUrl(election.id)).set(bearer(member)).send({ selections });
    expect(res.status).toBe(200);

    const status = await api().get(`/api/v1/elections/${election.id}/participation/me`).set(bearer(member));
    expect(status.body.data.hasVoted).toBe(true);

    const votes = await prisma.vote.findMany({ where: { electionId: election.id } });
    expect(votes).toHaveLength(2);
    // castAt is the election's start for every vote, never the real time.
    for (const v of votes) expect(v.castAt.toISOString()).toBe(election.startDate.toISOString());
    // Vote rows carry no voter identity at all.
    expect(Object.keys(votes[0])).not.toContain("userId");
    const chairVote = votes.find((v) => v.candidateId === chairA.id)!;
    expect(JSON.parse(decryptPayload(chairVote.encryptedPayload))).toEqual({ candidateId: chairA.id });

    // The audit entry says that a vote happened, never what was chosen.
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "VOTE_CAST" } });
    expect(JSON.stringify(log)).not.toContain(chairA.id);
  });

  it("one member, one vote, including two submissions at the same moment", async () => {
    const { member, election, selections } = await setupOpen();
    const [a, b] = await Promise.all([
      api().post(ballotUrl(election.id)).set(bearer(member)).send({ selections }),
      api().post(ballotUrl(election.id)).set(bearer(member)).send({ selections }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(await prisma.participation.count()).toBe(1);
    expect(await prisma.vote.count()).toBe(2);
    expect((await api().post(ballotUrl(election.id)).set(bearer(member)).send({ selections })).status).toBe(409);
    expect((await api().get(ballotUrl(election.id)).set(bearer(member))).status).toBe(409);
  });

  it("rejects invalid selections", async () => {
    const { member, election, chair, treasurer, chairA, treasA } = await setupOpen();
    const post = (selections: unknown) => api().post(ballotUrl(election.id)).set(bearer(member)).send({ selections });

    expect((await post([])).status).toBe(422);
    // Missing a position.
    expect((await post([{ positionId: chair.id, candidateId: chairA.id }])).status).toBe(409);
    // Candidate submitted under the wrong position.
    expect((await post([{ positionId: chair.id, candidateId: treasA.id }, { positionId: treasurer.id, candidateId: chairA.id }])).status).toBe(409);
    // Two picks for one position.
    expect((await post([{ positionId: chair.id, candidateId: chairA.id }, { positionId: chair.id, candidateId: chairA.id }])).status).toBe(409);
    // A pending candidate.
    const pending = await createCandidate(election.id, chair.id, "PENDING_REVIEW");
    expect((await post([{ positionId: chair.id, candidateId: pending.id }, { positionId: treasurer.id, candidateId: treasA.id }])).status).toBe(409);
    expect(await prisma.participation.count()).toBe(0);
  });

  it("ineligible members and closed or out-of-window elections are refused", async () => {
    const { election, selections } = await setupOpen();
    const lapsed = await createUser("MEMBER", { membershipStatus: "SUSPENDED" });
    expect((await api().get(ballotUrl(election.id)).set(bearer(lapsed))).status).toBe(403);
    expect((await api().post(ballotUrl(election.id)).set(bearer(lapsed)).send({ selections })).status).toBe(403);

    const member = await createUser("MEMBER");
    await prisma.election.update({ where: { id: election.id }, data: { endDate: new Date(Date.now() - 1000) } });
    expect((await api().post(ballotUrl(election.id)).set(bearer(member)).send({ selections })).status).toBe(403);

    await prisma.election.update({ where: { id: election.id }, data: { status: "CLOSED", endDate: new Date(Date.now() + 3600_000) } });
    expect((await api().post(ballotUrl(election.id)).set(bearer(member)).send({ selections })).status).toBe(403);
    expect(await prisma.vote.count()).toBe(0);
  });

  it("404 for an unknown election", async () => {
    const member = await createUser("MEMBER");
    expect((await api().get(ballotUrl("2f1c8d2e-2222-4a4a-8b8b-000000000000")).set(bearer(member))).status).toBe(404);
  });
});