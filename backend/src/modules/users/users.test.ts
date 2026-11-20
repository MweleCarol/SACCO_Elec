import { prisma } from "../../config/prisma";
import { api, bearer, createUser } from "../../../tests/helpers";

describe("own profile", () => {
  it("returns the caller's profile without secrets", async () => {
    const m = await createUser("MEMBER");
    const res = await api().get("/api/v1/users/me").set(bearer(m));
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(m.id);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|totpSecret/);
  });

  it("lets a member change email/phone but silently ignores role and synced fields (mass assignment)", async () => {
    const m = await createUser("MEMBER");
    const res = await api().patch("/api/v1/users/me").set(bearer(m)).send({
      phoneNumber: "+254700000001", role: "ELECTION_ADMINISTRATOR", membershipNumber: "HACKED",
      membershipStatus: "ACTIVE", status: "ACTIVE", fullName: "Someone Else",
    });
    expect(res.status).toBe(200);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: m.id } });
    expect(row.phoneNumber).toBe("+254700000001");
    expect(row.role).toBe("MEMBER");
    expect(row.membershipNumber).toBe(m.membershipNumber);
    expect(row.fullName).toBe(m.fullName);
  });

  it("refuses an email that belongs to someone else", async () => {
    const a = await createUser("MEMBER");
    const b = await createUser("MEMBER");
    expect((await api().patch("/api/v1/users/me").set(bearer(a)).send({ email: b.email })).status).toBe(422);
  });
});

describe("administration", () => {
  it("only an administrator can list, create or update users", async () => {
    for (const role of ["MEMBER", "ELECTION_OFFICER", "AUDITOR"] as const) {
      const u = await createUser(role);
      expect((await api().get("/api/v1/users").set(bearer(u))).status).toBe(403);
      expect((await api().post("/api/v1/users").set(bearer(u)).send({ email: "x@test.local", fullName: "X Y", role: "AUDITOR" })).status).toBe(403);
      expect((await api().patch(`/api/v1/users/${u.id}`).set(bearer(u)).send({ role: "ELECTION_ADMINISTRATOR" })).status).toBe(403);
    }
  });

  it("lists with filters and pagination", async () => {
    const admin = await createUser("ELECTION_ADMINISTRATOR");
    await createUser("MEMBER"); await createUser("MEMBER"); await createUser("AUDITOR");
    const res = await api().get("/api/v1/users?role=MEMBER&pageSize=1").set(bearer(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.users).toHaveLength(1);
    expect(res.body.data.pagination).toEqual({ page: 1, pageSize: 1, totalCount: 2, totalPages: 2 });
    expect((await api().get("/api/v1/users?role=GOD").set(bearer(admin))).status).toBe(422);
  });

  it("creates an officer with a one-time temporary password that works for login", async () => {
    const admin = await createUser("ELECTION_ADMINISTRATOR");
    const res = await api().post("/api/v1/users").set(bearer(admin)).send({ email: "new.officer@test.local", fullName: "New Officer", role: "ELECTION_OFFICER" });
    expect(res.status).toBe(201);
    const login = await api().post("/api/v1/auth/login").send({ email: "new.officer@test.local", password: res.body.data.temporaryPassword });
    expect(login.status).toBe(200);
    // Members only ever come from membership sync.
    expect((await api().post("/api/v1/users").set(bearer(admin)).send({ email: "m@test.local", fullName: "M M", role: "MEMBER" })).status).toBe(422);
  });

  it("suspends another user, but an admin cannot change their own role or status", async () => {
    const admin = await createUser("ELECTION_ADMINISTRATOR");
    const m = await createUser("MEMBER");
    const res = await api().patch(`/api/v1/users/${m.id}`).set(bearer(admin)).send({ status: "SUSPENDED" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("SUSPENDED");
    expect((await api().get("/api/v1/users/me").set(bearer(m))).status).toBe(401);

    expect((await api().patch(`/api/v1/users/${admin.id}`).set(bearer(admin)).send({ role: "AUDITOR" })).status).toBe(403);
    expect((await api().patch(`/api/v1/users/${admin.id}`).set(bearer(admin)).send({ status: "SUSPENDED" })).status).toBe(403);
  });

  it("404 for an unknown user and 422 for a malformed id", async () => {
    const admin = await createUser("ELECTION_ADMINISTRATOR");
    expect((await api().patch("/api/v1/users/7d7a2c38-1111-4f1b-9b2e-000000000000").set(bearer(admin)).send({ status: "ACTIVE" })).status).toBe(404);
    expect((await api().patch("/api/v1/users/not-a-uuid").set(bearer(admin)).send({ status: "ACTIVE" })).status).toBe(422);
  });
});

describe("membership sync", () => {
  it("creates pending members, updates on re-sync without touching status, and reports bad rows", async () => {
    const admin = await createUser("ELECTION_ADMINISTRATOR");
    const first = await api().post("/api/v1/membership-sync/run").set(bearer(admin)).send({
      records: [
        { membershipNumber: "A-1", fullName: "Amina One", branch: "Karatina" },
        { membershipNumber: "A-2", fullName: "Brian Two", branch: "Karatina", email: "brian@test.local" },
      ],
    });
    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({ recordsProcessed: 2, recordsCreated: 2, recordsFailed: 0 });

    await prisma.user.update({ where: { membershipNumber: "A-1" }, data: { status: "ACTIVE" } });
    const second = await api().post("/api/v1/membership-sync/run").set(bearer(admin)).send({
      records: [
        { membershipNumber: "A-1", fullName: "Amina One", branch: "Nyeri", membershipStatus: "SUSPENDED" },
        // Same email as A-2 under a new number: fails on its own without stopping the batch.
        { membershipNumber: "A-3", fullName: "Clash Three", branch: "Nyeri", email: "brian@test.local" },
      ],
    });
    expect(second.body.data).toMatchObject({ recordsUpdated: 1, recordsFailed: 1 });
    // The failure reason must not leak raw database/ORM error text.
    expect(second.body.data.errors[0].reason).not.toMatch(/prisma|invocation|`|\n/i);
    expect(second.body.data.errors[0].reason).toMatch(/^Another account already uses/);

    const a1 = await prisma.user.findUniqueOrThrow({ where: { membershipNumber: "A-1" } });
    expect(a1.status).toBe("ACTIVE");
    expect(a1.branch).toBe("Nyeri");
    expect(a1.membershipStatus).toBe("SUSPENDED");
  });

  it("is administrator-only", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const res = await api().post("/api/v1/membership-sync/run").set(bearer(officer)).send({ records: [{ membershipNumber: "X", fullName: "Xx Yy", branch: "B" }] });
    expect(res.status).toBe(403);
  });
});