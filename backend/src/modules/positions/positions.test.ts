import { api, bearer, createCandidate, createElection, createPosition, createUser } from "../../../tests/helpers";

describe("positions", () => {
  it("officers manage positions only while the election is DRAFT", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const e = await createElection(officer.id);

    const created = await api().post(`/api/v1/elections/${e.id}/positions`).set(bearer(officer)).send({ name: "Chairperson", order: 1 });
    expect(created.status).toBe(201);
    expect(created.body.data.seats).toBe(1);
    const id = created.body.data.id;

    expect((await api().post(`/api/v1/elections/${e.id}/positions`).set(bearer(officer)).send({ name: "Chairperson" })).status).toBe(409);
    expect((await api().patch(`/api/v1/positions/${id}`).set(bearer(officer)).send({ name: "Chair" })).body.data.name).toBe("Chair");

    // Members cannot see a DRAFT election's positions (visibility policy), so list as the officer.
    const list = await api().get(`/api/v1/elections/${e.id}/positions`).set(bearer(officer));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    expect((await api().delete(`/api/v1/positions/${id}`).set(bearer(officer))).status).toBe(200);
  });

  it("blocks changes outside DRAFT and deleting a position that has candidates", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const approved = await createElection(officer.id, { status: "APPROVED" });
    const p = await createPosition(approved.id);
    expect((await api().post(`/api/v1/elections/${approved.id}/positions`).set(bearer(officer)).send({ name: "Secretary" })).status).toBe(403);
    expect((await api().patch(`/api/v1/positions/${p.id}`).set(bearer(officer)).send({ name: "Renamed" })).status).toBe(403);

    const draft = await createElection(officer.id);
    const p2 = await createPosition(draft.id);
    await createCandidate(draft.id, p2.id);
    expect((await api().delete(`/api/v1/positions/${p2.id}`).set(bearer(officer))).status).toBe(409);
  });

  it("non-officers cannot create positions", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const e = await createElection(officer.id);
    for (const role of ["MEMBER", "AUDITOR", "ELECTION_ADMINISTRATOR"] as const) {
      expect((await api().post(`/api/v1/elections/${e.id}/positions`).set(bearer(await createUser(role))).send({ name: "Treasurer" })).status).toBe(403);
    }
  });
});