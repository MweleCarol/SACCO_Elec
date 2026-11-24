import { prisma } from "../../config/prisma";
import {
  api,
  bearer,
  createCandidate,
  createElection,
  createPosition,
  createUser,
} from "../../../tests/helpers";

describe("candidates", () => {
  it("officers review applications: approve; a rejected candidate cannot later be approved", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const e = await createElection(officer.id);
    const p = await createPosition(e.id);

    const pending = await createCandidate(
      e.id,
      p.id,
      "PENDING_REVIEW",
      "Grace Muthoni",
    );
    expect(
      (
        await api()
          .post(`/api/v1/candidates/${pending.id}/approve`)
          .set(bearer(officer))
          .send({ decision: "APPROVE" })
      ).body.data.status,
    ).toBe("APPROVED");

    const other = await createCandidate(e.id, p.id, "PENDING_REVIEW");
    expect(
      (
        await api()
          .post(`/api/v1/candidates/${other.id}/reject`)
          .set(bearer(officer))
          .send({ decision: "REJECT" })
      ).body.data.status,
    ).toBe("REJECTED");
    expect(
      (
        await api()
          .post(`/api/v1/candidates/${other.id}/approve`)
          .set(bearer(officer))
          .send({ decision: "APPROVE" })
      ).status,
    ).toBe(409);
  });

  it("officers cannot add or edit candidates directly: every candidate is a member who applied", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const e = await createElection(officer.id);
    const p = await createPosition(e.id);
    const c = await createCandidate(e.id, p.id, "PENDING_REVIEW");
    expect(
      (
        await api()
          .post(`/api/v1/elections/${e.id}/candidates`)
          .set(bearer(officer))
          .send({ positionId: p.id, displayName: "Typed In" })
      ).status,
    ).toBe(404);
    expect(
      (
        await api()
          .patch(`/api/v1/candidates/${c.id}`)
          .set(bearer(officer))
          .send({ displayName: "Changed" })
      ).status,
    ).toBe(404);
    expect(await prisma.candidate.count({ where: { electionId: e.id } })).toBe(
      1,
    );
  });

  it("locks candidate review and withdrawal once the election is ACTIVE", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const e = await createElection(officer.id, { status: "ACTIVE" });
    const p = await createPosition(e.id);
    const c = await createCandidate(e.id, p.id, "APPROVED");
    const pending = await createCandidate(e.id, p.id, "PENDING_REVIEW");
    expect(
      (
        await api()
          .post(`/api/v1/candidates/${c.id}/withdraw`)
          .set(bearer(officer))
          .send({})
      ).status,
    ).toBe(403);
    expect(
      (
        await api()
          .post(`/api/v1/candidates/${pending.id}/approve`)
          .set(bearer(officer))
          .send({ decision: "APPROVE" })
      ).status,
    ).toBe(403);
  });
  it("withdraw: the officer or the linked member may withdraw; another member may not", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const linked = await createUser("MEMBER");
    const stranger = await createUser("MEMBER");
    const e = await createElection(officer.id);
    const p = await createPosition(e.id);
    const c = await prisma.candidate.create({
      data: {
        electionId: e.id,
        positionId: p.id,
        displayName: "Self",
        memberId: linked.id,
      },
    });

    expect(
      (
        await api()
          .post(`/api/v1/candidates/${c.id}/withdraw`)
          .set(bearer(stranger))
          .send({})
      ).status,
    ).toBe(403);
    // No body at all must work too (the reason is optional).
    const ok = await api()
      .post(`/api/v1/candidates/${c.id}/withdraw`)
      .set(bearer(linked));
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe("WITHDRAWN");
    expect(
      (
        await api()
          .post(`/api/v1/candidates/${c.id}/withdraw`)
          .set(bearer(officer))
          .send({})
      ).status,
    ).toBe(409);
  });

  it("lists candidates with status and position filters", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const e = await createElection(officer.id);
    const p1 = await createPosition(e.id);
    const p2 = await createPosition(e.id);
    await createCandidate(e.id, p1.id, "APPROVED");
    await createCandidate(e.id, p1.id, "REJECTED");
    await createCandidate(e.id, p2.id, "APPROVED");
    const h = bearer(officer);
    expect(
      (await api().get(`/api/v1/elections/${e.id}/candidates`).set(h)).body
        .data,
    ).toHaveLength(3);
    expect(
      (
        await api()
          .get(`/api/v1/elections/${e.id}/candidates?status=APPROVED`)
          .set(h)
      ).body.data,
    ).toHaveLength(2);
    expect(
      (
        await api()
          .get(
            `/api/v1/elections/${e.id}/candidates?status=APPROVED&positionId=${p1.id}`,
          )
          .set(h)
      ).body.data,
    ).toHaveLength(1);
  });
});
