import { prisma } from "../../config/prisma";
import {
  api,
  bearer,
  createOpenElection,
  createUser,
  waitFor,
} from "../../../tests/helpers";

async function votedAndClosed() {
  const officer = await createUser("ELECTION_OFFICER");
  const o2 = await createUser("ELECTION_OFFICER");
  const o3 = await createUser("ELECTION_OFFICER");
  const fx = await createOpenElection(officer.id, 2);
  // Chair: Alice 2, Bob 1. Treasurer: Carol 1, Dan 2.
  const picks: [string, string][] = [
    [fx.chairA.id, fx.treasB.id],
    [fx.chairA.id, fx.treasB.id],
    [fx.chairB.id, fx.treasA.id],
  ];
  for (const [chairPick, treasPick] of picks) {
    const m = await createUser("MEMBER");
    const res = await api()
      .post(`/api/v1/elections/${fx.election.id}/ballot`)
      .set(bearer(m))
      .send({
        selections: [
          { positionId: fx.chair.id, candidateId: chairPick },
          { positionId: fx.treasurer.id, candidateId: treasPick },
        ],
      });
    expect(res.status).toBe(200);
  }
  expect(
    (
      await api()
        .post(`/api/v1/elections/${fx.election.id}/close`)
        .set(bearer(officer))
    ).status,
  ).toBe(200);
  return { officer, o2, o3, ...fx };
}

const url = (id: string, suffix = "") =>
  `/api/v1/elections/${id}/results${suffix}`;

describe("results", () => {
  it("tally only when CLOSED", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const { election } = await createOpenElection(officer.id);
    expect(
      (await api().post(url(election.id, "/tally")).set(bearer(officer)))
        .status,
    ).toBe(403);
  });

  it("tallies correctly, hides results from members until publication, publishes via DAT", async () => {
    const { officer, o2, o3, election, chairA, treasB } =
      await votedAndClosed();
    expect(
      (await api().post(url(election.id, "/tally")).set(bearer(officer)))
        .status,
    ).toBe(200);

    const priv = await api()
      .get(url(election.id))
      .set(bearer(await createUser("AUDITOR")));
    expect(priv.status).toBe(200);
    const winners = priv.body.data
      .filter((r: { isWinner: boolean }) => r.isWinner)
      .map((r: { candidateId: string }) => r.candidateId)
      .sort();
    expect(winners).toEqual([chairA.id, treasB.id].sort());
    const alice = priv.body.data.find(
      (r: { candidateId: string }) => r.candidateId === chairA.id,
    );
    expect(alice.voteCount).toBe(2);

    const member = await createUser("MEMBER");
    expect((await api().get(url(election.id)).set(bearer(member))).status).toBe(
      403,
    );

    const pub = await api()
      .post(url(election.id, "/publish"))
      .set(bearer(officer));
    expect(pub.body.data.actionType).toBe("RESULT_PUBLICATION");
    await api()
      .post(`/api/v1/approval-requests/${pub.body.data.id}/decide`)
      .set(bearer(o2))
      .send({ decision: "APPROVE" });
    const done = await api()
      .post(`/api/v1/approval-requests/${pub.body.data.id}/decide`)
      .set(bearer(o3))
      .send({ decision: "APPROVE" });
    expect(done.body.data.status).toBe("EXECUTED");

    expect(
      (await prisma.election.findUniqueOrThrow({ where: { id: election.id } }))
        .status,
    ).toBe("RESULTS_PUBLISHED");
    const pubRes = await api().get(url(election.id)).set(bearer(member));
    expect(pubRes.status).toBe(200);
    expect(
      pubRes.body.data.every(
        (r: { status: string }) => r.status === "PUBLISHED",
      ),
    ).toBe(true);

    // Published results are final.
    expect(
      (await api().post(url(election.id, "/tally")).set(bearer(officer)))
        .status,
    ).toBe(403);

    const notified = await waitFor(
      () =>
        prisma.notification.count({
          where: { userId: member.id, type: "RESULTS_PUBLISHED" },
        }),
      (c) => c > 0,
    );
    expect(notified).toBe(1);
  });

  it("publication needs a tally first and only officers can tally or publish", async () => {
    const { officer, election } = await votedAndClosed();
    expect(
      (await api().post(url(election.id, "/publish")).set(bearer(officer)))
        .status,
    ).toBe(409);
    expect(
      (
        await api()
          .post(url(election.id, "/tally"))
          .set(bearer(await createUser("ELECTION_ADMINISTRATOR")))
      ).status,
    ).toBe(403);
  });

  it("ties go to the earliest-registered candidate (documented rule)", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const fx = await createOpenElection(officer.id);
    for (const pick of [fx.chairA.id, fx.chairB.id]) {
      await api()
        .post(`/api/v1/elections/${fx.election.id}/ballot`)
        .set(bearer(await createUser("MEMBER")))
        .send({
          selections: [
            { positionId: fx.chair.id, candidateId: pick },
            { positionId: fx.treasurer.id, candidateId: fx.treasA.id },
          ],
        });
    }
    await api()
      .post(`/api/v1/elections/${fx.election.id}/close`)
      .set(bearer(officer));
    await api().post(url(fx.election.id, "/tally")).set(bearer(officer));
    const chairWinner = await prisma.result.findFirstOrThrow({
      where: { positionId: fx.chair.id, isWinner: true },
    });
    expect(chairWinner.candidateId).toBe(fx.chairA.id);
  });

  it("members can still read published results after the election is archived", async () => {
    const { officer, o2, o3, election } = await votedAndClosed();
    await api().post(url(election.id, "/tally")).set(bearer(officer));
    const pub = await api()
      .post(url(election.id, "/publish"))
      .set(bearer(officer));
    await api()
      .post(`/api/v1/approval-requests/${pub.body.data.id}/decide`)
      .set(bearer(o2))
      .send({ decision: "APPROVE" });
    await api()
      .post(`/api/v1/approval-requests/${pub.body.data.id}/decide`)
      .set(bearer(o3))
      .send({ decision: "APPROVE" });
    await prisma.election.update({
      where: { id: election.id },
      data: { status: "ARCHIVED", archivedAt: new Date() },
    });

    const res = await api()
      .get(url(election.id))
      .set(bearer(await createUser("MEMBER")));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("an unknown election is 404", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    expect(
      (
        await api()
          .get(url("3a5b8c1d-3333-4c4c-9d9d-000000000000"))
          .set(bearer(officer))
      ).status,
    ).toBe(404);
  });
  it("turnout: staff see it live, members only after publication; eligible count is fixed at close", async () => {
    const { officer, o2, o3, election } = await votedAndClosed();
    // 3 members voted; they were the only active members when voting closed.
    const auditor = await createUser("AUDITOR");
    const live = await api()
      .get(`/api/v1/elections/${election.id}/turnout`)
      .set(bearer(auditor));
    expect(live.status).toBe(200);
    expect(live.body.data).toEqual({
      votesCast: 3,
      eligibleVoters: 3,
      turnoutPercent: 100,
      isLive: false,
    });

    // A member who joins after the close does not change the snapshot...
    const lateMember = await createUser("MEMBER");
    // ...and cannot see turnout before results are published.
    expect(
      (
        await api()
          .get(`/api/v1/elections/${election.id}/turnout`)
          .set(bearer(lateMember))
      ).status,
    ).toBe(403);

    await api().post(url(election.id, "/tally")).set(bearer(officer));
    const pub = await api()
      .post(url(election.id, "/publish"))
      .set(bearer(officer));
    await api()
      .post(`/api/v1/approval-requests/${pub.body.data.id}/decide`)
      .set(bearer(o2))
      .send({ decision: "APPROVE" });
    await api()
      .post(`/api/v1/approval-requests/${pub.body.data.id}/decide`)
      .set(bearer(o3))
      .send({ decision: "APPROVE" });

    const after = await api()
      .get(`/api/v1/elections/${election.id}/turnout`)
      .set(bearer(lateMember));
    expect(after.status).toBe(200);
    expect(after.body.data.eligibleVoters).toBe(3);
    expect(after.body.data.turnoutPercent).toBe(100);
  });

  it("turnout while voting is open is live for staff and hidden from members", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const fx = await createOpenElection(officer.id);
    const voter = await createUser("MEMBER");
    await createUser("MEMBER"); // eligible, has not voted
    await api()
      .post(`/api/v1/elections/${fx.election.id}/ballot`)
      .set(bearer(voter))
      .send({
        selections: [
          { positionId: fx.chair.id, candidateId: fx.chairA.id },
          { positionId: fx.treasurer.id, candidateId: fx.treasA.id },
        ],
      });
    const res = await api()
      .get(`/api/v1/elections/${fx.election.id}/turnout`)
      .set(bearer(officer));
    expect(res.body.data).toEqual({
      votesCast: 1,
      eligibleVoters: 2,
      turnoutPercent: 50,
      isLive: true,
    });
    expect(
      (
        await api()
          .get(`/api/v1/elections/${fx.election.id}/turnout`)
          .set(bearer(voter))
      ).status,
    ).toBe(403);
  });
});
