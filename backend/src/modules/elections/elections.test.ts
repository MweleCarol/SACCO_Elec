import { prisma } from "../../config/prisma";
import { api, bearer, createElection, createPosition, createUser, waitFor } from "../../../tests/helpers";

const future = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

describe("create and edit", () => {
  it("an officer creates a DRAFT election; other roles cannot", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const body = { name: "AGM 2027", startDate: future(24), endDate: future(48), requiredApprovals: 2 };
    const res = await api().post("/api/v1/elections").set(bearer(officer)).send(body);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("DRAFT");
    for (const role of ["MEMBER", "AUDITOR", "ELECTION_ADMINISTRATOR"] as const) {
      expect((await api().post("/api/v1/elections").set(bearer(await createUser(role))).send(body)).status).toBe(403);
    }
  });

  it("validates dates", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const past = await api().post("/api/v1/elections").set(bearer(officer)).send({ name: "Past", startDate: future(-1), endDate: future(5) });
    expect(past.status).toBe(422);
    const backwards = await api().post("/api/v1/elections").set(bearer(officer)).send({ name: "Backwards", startDate: future(10), endDate: future(5) });
    expect(backwards.status).toBe(422);
  });

  it("only DRAFT elections can be edited, and a partial edit cannot make dates invalid", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const e = await createElection(officer.id);
    expect((await api().patch(`/api/v1/elections/${e.id}`).set(bearer(officer)).send({ endDate: future(1) })).status).toBe(409);
    expect((await api().patch(`/api/v1/elections/${e.id}`).set(bearer(officer)).send({ name: "Renamed" })).body.data.name).toBe("Renamed");
    const approved = await createElection(officer.id, { status: "APPROVED" });
    expect((await api().patch(`/api/v1/elections/${approved.id}`).set(bearer(officer)).send({ name: "Nope" })).status).toBe(403);
  });

  it("lists with a status filter and returns 404/422 for bad ids", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    await createElection(officer.id);
    await createElection(officer.id, { status: "APPROVED" });
    const res = await api().get("/api/v1/elections?status=APPROVED").set(bearer(officer));
    expect(res.body.data.elections).toHaveLength(1);
    expect(res.body.data.pagination.totalCount).toBe(1);
    expect((await api().get("/api/v1/elections/1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed").set(bearer(officer))).status).toBe(404);
    expect((await api().get("/api/v1/elections/abc").set(bearer(officer))).status).toBe(422);
    expect((await api().get("/api/v1/elections")).status).toBe(401);
  });
});

describe("lifecycle", () => {
  it("DRAFT -> submit -> admin review approve -> APPROVED; reject sends it back to DRAFT", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const admin = await createUser("ELECTION_ADMINISTRATOR");
    const e = await createElection(officer.id);

    // No positions yet: nothing for the administrator to review.
    const empty = await api().post(`/api/v1/elections/${e.id}/submit-approval`).set(bearer(officer));
    expect(empty.status).toBe(409);
    expect(empty.body.message).toMatch(/at least one position/);
    await createPosition(e.id, "Chairperson");

    expect((await api().post(`/api/v1/elections/${e.id}/submit-approval`).set(bearer(officer))).body.data.status).toBe("PENDING_APPROVAL");
    // Officers cannot review; admins can.
    expect((await api().post(`/api/v1/elections/${e.id}/review-approval`).set(bearer(officer)).send({ decision: "APPROVE" })).status).toBe(403);
    expect((await api().post(`/api/v1/elections/${e.id}/review-approval`).set(bearer(admin)).send({ decision: "REJECT", comment: "Fix dates" })).body.data.status).toBe("DRAFT");

    // The officer who created it is told why.
    const note = await waitFor(
      () => prisma.notification.findFirst({ where: { userId: officer.id, title: "Your election was sent back to draft" } }),
      (n) => n !== null
    );
    expect(note!.message).toContain("Fix dates");
    expect(note!.electionId).toBe(e.id);

    await api().post(`/api/v1/elections/${e.id}/submit-approval`).set(bearer(officer));
    expect((await api().post(`/api/v1/elections/${e.id}/review-approval`).set(bearer(admin)).send({ decision: "APPROVE" })).body.data.status).toBe("APPROVED");
    expect((await api().post(`/api/v1/elections/${e.id}/review-approval`).set(bearer(admin)).send({ decision: "APPROVE" })).status).toBe(409);
  });

  it("invalid transitions are 409, not 500", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const draft = await createElection(officer.id);
    expect((await api().post(`/api/v1/elections/${draft.id}/activate`).set(bearer(officer))).status).toBe(409);
    expect((await api().post(`/api/v1/elections/${draft.id}/close`).set(bearer(officer))).status).toBe(409);
    const closed = await createElection(officer.id, { status: "CLOSED" });
    expect((await api().post(`/api/v1/elections/${closed.id}/submit-approval`).set(bearer(officer))).status).toBe(409);
  });

  it("an officer closes an ACTIVE election directly and it is audited", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const e = await createElection(officer.id, { status: "ACTIVE" });
    const res = await api().post(`/api/v1/elections/${e.id}/close`).set(bearer(officer));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CLOSED");
    expect(await prisma.auditLog.count({ where: { action: "ELECTION_CLOSED", electionId: e.id } })).toBe(1);
  });

  it("activate / cancel / reschedule create DAT requests instead of acting immediately", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const admin = await createUser("ELECTION_ADMINISTRATOR");
    const e = await createElection(officer.id, { status: "APPROVED" });

    const act = await api().post(`/api/v1/elections/${e.id}/activate`).set(bearer(officer));
    expect(act.status).toBe(200);
    expect(act.body.data).toMatchObject({ actionType: "ELECTION_ACTIVATION", status: "PENDING", requiredApprovals: 2 });

    const resch = await api().post(`/api/v1/elections/${e.id}/reschedule`).set(bearer(officer)).send({ startDate: future(30), endDate: future(60) });
    expect(resch.body.data.actionType).toBe("ELECTION_RESCHEDULE");

    // Cancellation is administrator-only.
    expect((await api().post(`/api/v1/elections/${e.id}/cancel`).set(bearer(officer)).send({ reason: "Venue issue" })).status).toBe(403);
    const cancel = await api().post(`/api/v1/elections/${e.id}/cancel`).set(bearer(admin)).send({ reason: "Venue issue" });
    expect(cancel.body.data.actionType).toBe("ELECTION_CANCELLATION");

    expect((await prisma.election.findUniqueOrThrow({ where: { id: e.id } })).status).toBe("APPROVED");
  });
});