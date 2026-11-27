import { authenticator } from "otplib";
import { prisma } from "../../config/prisma";
import { encryptPayload } from "../../shared/utils/crypto";
import { api, bearer, createUser, randomTotpSecretPlain, TEST_PASSWORD } from "../../../tests/helpers";

const STRONG = "NewStrongPass9";

async function login(email: string, password = TEST_PASSWORD) {
  return api().post("/api/v1/auth/login").send({ email, password });
}

function refreshCookie(res: { headers: Record<string, unknown> }): string {
  const cookies = (res.headers["set-cookie"] as string[] | undefined) ?? [];
  const c = cookies.find((x) => x.startsWith("refreshToken="));
  if (!c) throw new Error("no refresh cookie set");
  return c.split(";")[0];
}

describe("sync-bound registration", () => {
  async function seedPending(membershipStatus: "ACTIVE" | "SUSPENDED" = "ACTIVE") {
    const admin = await createUser("ELECTION_ADMINISTRATOR");
    const res = await api().post("/api/v1/membership-sync/run").set(bearer(admin)).send({
      records: [{ membershipNumber: "SAC-100", fullName: "Jane Wanjiku", branch: "Nyeri", membershipStatus }],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.recordsCreated).toBe(1);
  }

  const body = (over: Record<string, string> = {}) => ({
    membershipNumber: "SAC-100", fullName: "Jane Wanjiku", email: "jane@test.local",
    password: STRONG, confirmPassword: STRONG, ...over,
  });

  it("registers a synced member, then refuses a second registration", async () => {
    await seedPending();
    expect((await api().post("/api/v1/auth/register").send(body({ fullName: "Wrong Name" }))).status).toBe(409);
    const ok = await api().post("/api/v1/auth/register").send(body({ fullName: "  jane wanjiku " }));
    expect(ok.status).toBe(201);
    expect(ok.body.data).not.toHaveProperty("passwordHash");
    expect((await api().post("/api/v1/auth/register").send(body())).status).toBe(409);
    const l = await login("jane@test.local", STRONG);
    expect(l.status).toBe(200);
    expect(l.body.data.user.role).toBe("MEMBER");
  });

  it("gives the same answer for an unknown membership number as for a wrong name", async () => {
    await seedPending();
    const unknown = await api().post("/api/v1/auth/register").send(body({ membershipNumber: "NOPE" }));
    const wrongName = await api().post("/api/v1/auth/register").send(body({ fullName: "Someone Else" }));
    expect(unknown.status).toBe(409);
    expect(unknown.body.message).toBe(wrongName.body.message);
  });

  it("refuses a member whose SACCO membership is not active", async () => {
    await seedPending("SUSPENDED");
    expect((await api().post("/api/v1/auth/register").send(body())).status).toBe(403);
  });

  it("validates password strength and confirmation", async () => {
    const res = await api().post("/api/v1/auth/register").send(body({ password: "weak", confirmPassword: "other" }));
    expect(res.status).toBe(422);
  });

  it("a pending (unregistered) account cannot log in", async () => {
    await seedPending();
    expect((await login("pending+sac-100@sevs.local")).status).toBe(403);
  });
});

describe("login, refresh, logout", () => {
  it("logs in, sets an httpOnly refresh cookie scoped to /api/v1/auth, and never returns secrets", async () => {
    const u = await createUser("ELECTION_OFFICER", { mfaEnabled: false });
    const res = await login(u.email);
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toEqual(expect.any(String));
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|totpSecret/);
    const cookie = (res.headers["set-cookie"] as unknown as string[]).find((c) => c.startsWith("refreshToken="))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it("uses one generic message for unknown email and wrong password", async () => {
    const u = await createUser("MEMBER");
    const a = await login("nobody@test.local");
    const b = await login(u.email, "WrongPass123");
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.message).toBe(b.body.message);
  });

  it("rejects suspended accounts at login", async () => {
    const u = await createUser("MEMBER", { status: "SUSPENDED" });
    expect((await login(u.email)).status).toBe(403);
  });

  it("rotates the refresh token, and reuse of an old one revokes every session", async () => {
    const u = await createUser("MEMBER");
    const first = refreshCookie(await login(u.email));

    const r1 = await api().post("/api/v1/auth/refresh").set("Cookie", first).send({});
    expect(r1.status).toBe(200);
    const second = refreshCookie(r1);
    expect(second).not.toBe(first);

    const replay = await api().post("/api/v1/auth/refresh").set("Cookie", first).send({});
    expect(replay.status).toBe(401);
    expect((await api().post("/api/v1/auth/refresh").set("Cookie", second).send({})).status).toBe(401);
    expect(await prisma.auditLog.count({ where: { action: "REFRESH_TOKEN_REUSE_DETECTED" } })).toBeGreaterThanOrEqual(1);
  });

  it("refresh works with no body at all, and fails cleanly with no cookie", async () => {
    const u = await createUser("MEMBER");
    const cookie = refreshCookie(await login(u.email));
    expect((await api().post("/api/v1/auth/refresh").set("Cookie", cookie)).status).toBe(200);
    expect((await api().post("/api/v1/auth/refresh").send({})).status).toBe(401);
  });

  it("logout revokes the refresh token", async () => {
    const u = await createUser("MEMBER");
    const cookie = refreshCookie(await login(u.email));
    const out = await api().post("/api/v1/auth/logout").set(bearer(u)).set("Cookie", cookie);
    expect(out.status).toBe(200);
    expect((await api().post("/api/v1/auth/refresh").set("Cookie", cookie).send({})).status).toBe(401);
  });

  it("GET /auth/me needs a token and returns id and role", async () => {
    const u = await createUser("AUDITOR");
    expect((await api().get("/api/v1/auth/me")).status).toBe(401);
    expect((await api().get("/api/v1/auth/me").set("Authorization", "Bearer garbage")).status).toBe(401);
    const res = await api().get("/api/v1/auth/me").set(bearer(u));
    expect(res.body.data).toEqual({ id: u.id, role: "AUDITOR" });
  });
});

describe("account lockout", () => {
  it("locks one account after 5 failures (even with the right password) without affecting others", async () => {
    const victim = await createUser("MEMBER");
    const bystander = await createUser("MEMBER");
    for (let i = 0; i < 5; i++) expect((await login(victim.email, "WrongPass123")).status).toBe(401);

    const locked = await login(victim.email);
    expect(locked.status).toBe(429);
    expect(locked.body.message).toMatch(/Too many failed attempts/);
    expect((await login(bystander.email)).status).toBe(200);
  });

  it("blocked attempts do not extend the lock", async () => {
    const u = await createUser("MEMBER");
    for (let i = 0; i < 5; i++) await login(u.email, "WrongPass123");
    for (let i = 0; i < 3; i++) await login(u.email);
    expect(await prisma.auditLog.count({ where: { actorId: u.id, action: "LOGIN_FAILED" } })).toBe(5);
    expect(await prisma.auditLog.count({ where: { actorId: u.id, action: "LOGIN_BLOCKED" } })).toBe(3);
  });
});

describe("MFA", () => {
  async function enableMfaViaApi(user: { id: string; role: "MEMBER" | "ELECTION_OFFICER" }) {
    const enroll = await api().post("/api/v1/auth/mfa/enroll").set(bearer(user));
    expect(enroll.status).toBe(200);
    const secret: string = enroll.body.data.totpSecret;
    const confirm = await api().post("/api/v1/auth/mfa/confirm").set(bearer(user)).send({ totpCode: authenticator.generate(secret) });
    expect(confirm.status).toBe(200);
    return secret;
  }

  it("stores the TOTP secret encrypted, not as plain base32", async () => {
    const u = await createUser("ELECTION_OFFICER", { mfaEnabled: false });
    const secret = await enableMfaViaApi(u as never);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row.mfaEnabled).toBe(true);
    expect(row.totpSecret).not.toBe(secret);
    expect(row.totpSecret!.split(":")).toHaveLength(3);
  });

  it("requires the second step, rejects a replayed code, and refuses re-enrolment", async () => {
    const u = await createUser("ELECTION_OFFICER", { mfaEnabled: false });
    const secret = await enableMfaViaApi(u as never);

    const step1 = await login(u.email);
    expect(step1.status).toBe(200);
    expect(step1.body.data).toEqual({ mfaRequired: true, mfaChallengeToken: expect.any(String) });
    expect(step1.headers["set-cookie"]).toBeUndefined();

    const code = authenticator.generate(secret);
    const ok = await api().post("/api/v1/auth/verify-mfa").send({ mfaChallengeToken: step1.body.data.mfaChallengeToken, totpCode: code });
    expect(ok.status).toBe(200);
    expect(ok.body.data.accessToken).toEqual(expect.any(String));

    const again = await login(u.email);
    const replay = await api().post("/api/v1/auth/verify-mfa").send({ mfaChallengeToken: again.body.data.mfaChallengeToken, totpCode: code });
    expect(replay.status).toBe(401);

    expect((await api().post("/api/v1/auth/mfa/enroll").set(bearer(u))).status).toBe(409);
  });

  // Regression: the challenge token used to work as a full access token.
  it("the MFA challenge token cannot be used as an access token", async () => {
    const u = await createUser("ELECTION_OFFICER", { mfaEnabled: false });
    await enableMfaViaApi(u as never);
    const challenge = (await login(u.email)).body.data.mfaChallengeToken;

    const me = await api().get("/api/v1/auth/me").set("Authorization", `Bearer ${challenge}`);
    expect(me.status).toBe(401);
    const create = await api().post("/api/v1/elections").set("Authorization", `Bearer ${challenge}`).send({
      name: "Bypass attempt", startDate: new Date(Date.now() + 864e5), endDate: new Date(Date.now() + 2 * 864e5),
    });
    expect(create.status).toBe(401);
    expect(await prisma.election.count()).toBe(0);
  });

  it("an access token cannot be used as an MFA challenge token", async () => {
    const u = await createUser("ELECTION_OFFICER", { mfaEnabled: false });
    const secret = await enableMfaViaApi(u as never);
    const accessToken = bearer(u).Authorization.slice(7);
    const res = await api().post("/api/v1/auth/verify-mfa").send({ mfaChallengeToken: accessToken, totpCode: authenticator.generate(secret) });
    expect(res.status).toBe(401);
  });

  it("upgrades a legacy plaintext secret to encrypted on the next MFA login", async () => {
    const plain = randomTotpSecretPlain();
    const u = await createUser("ELECTION_OFFICER", { mfaEnabled: true, totpSecret: plain });
    const step1 = await login(u.email);
    const ok = await api().post("/api/v1/auth/verify-mfa").send({
      mfaChallengeToken: step1.body.data.mfaChallengeToken, totpCode: authenticator.generate(plain),
    });
    expect(ok.status).toBe(200);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row.totpSecret).not.toBe(plain);
    expect(row.totpSecret).toContain(":");
  });

  it("five wrong MFA codes lock the account", async () => {
    const plain = randomTotpSecretPlain();
    const u = await createUser("ELECTION_OFFICER", { mfaEnabled: true, totpSecret: encryptPayload(plain) });
    const challenge = (await login(u.email)).body.data.mfaChallengeToken;
    for (let i = 0; i < 5; i++) {
      await api().post("/api/v1/auth/verify-mfa").send({ mfaChallengeToken: challenge, totpCode: "000000" });
    }
    const res = await api().post("/api/v1/auth/verify-mfa").send({ mfaChallengeToken: challenge, totpCode: authenticator.generate(plain) });
    expect(res.status).toBe(429);
  });
});

describe("password change and live account state", () => {
  it("changing the password revokes refresh tokens and the old password stops working", async () => {
    const u = await createUser("MEMBER");
    const cookie = refreshCookie(await login(u.email));
    const wrong = await api().patch("/api/v1/auth/me/password").set(bearer(u))
      .send({ currentPassword: "WrongPass123", newPassword: STRONG, confirmNewPassword: STRONG });
    expect(wrong.status).toBe(422);
    const res = await api().patch("/api/v1/auth/me/password").set(bearer(u))
      .send({ currentPassword: TEST_PASSWORD, newPassword: STRONG, confirmNewPassword: STRONG });
    expect(res.status).toBe(200);
    expect((await api().post("/api/v1/auth/refresh").set("Cookie", cookie).send({})).status).toBe(401);
    expect((await login(u.email)).status).toBe(401);
    expect((await login(u.email, STRONG)).status).toBe(200);
  });

  it("suspending a user kills their existing access token immediately", async () => {
    const u = await createUser("MEMBER");
    const headers = bearer(u);
    expect((await api().get("/api/v1/users/me").set(headers)).status).toBe(200);
    await prisma.user.update({ where: { id: u.id }, data: { status: "SUSPENDED" } });
    const res = await api().get("/api/v1/users/me").set(headers);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Account is not active.");
  });

  it("a role change takes effect on the next request (role comes from the DB, not the token)", async () => {
    const u = await createUser("ELECTION_ADMINISTRATOR");
    const headers = bearer(u);
    expect((await api().get("/api/v1/users").set(headers)).status).toBe(200);
    await prisma.user.update({ where: { id: u.id }, data: { role: "MEMBER" } });
    expect((await api().get("/api/v1/users").set(headers)).status).toBe(403);
  });
});