import { authenticator } from "otplib";
import { prisma } from "../../config/prisma";
import { api, bearer, createUser, TEST_PASSWORD } from "../../../tests/helpers";

type U = { id: string; email: string; role: "MEMBER" | "ELECTION_OFFICER" | "AUDITOR" };

// Turns two-factor on through the API; returns the app secret and backup codes.
async function enableMfa(u: U) {
  const enroll = await api().post("/api/v1/auth/mfa/enroll").set(bearer(u));
  const secret: string = enroll.body.data.totpSecret;
  const confirm = await api().post("/api/v1/auth/mfa/confirm").set(bearer(u)).send({ totpCode: authenticator.generate(secret) });
  expect(confirm.status).toBe(200);
  return { secret, codes: confirm.body.data.backupCodes as string[] };
}

async function challenge(email: string): Promise<string> {
  const res = await api().post("/api/v1/auth/login").send({ email, password: TEST_PASSWORD });
  return res.body.data.mfaChallengeToken;
}

describe("two-factor backup codes", () => {
  it("confirming two-factor returns 8 unique codes once; only keyed hashes are stored", async () => {
    const u = (await createUser("MEMBER")) as U;
    const { codes } = await enableMfa(u);
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    for (const c of codes) expect(c).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);

    const rows = await prisma.mfaBackupCode.findMany({ where: { userId: u.id } });
    expect(rows).toHaveLength(8);
    for (const r of rows) {
      expect(r.codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(codes.map((c) => c.replace("-", ""))).not.toContain(r.codeHash);
    }
    const profile = await api().get("/api/v1/auth/profile").set(bearer(u));
    expect(profile.body.data).toMatchObject({ mfaEnabled: true, backupCodesRemaining: 8, mfaRequired: false });
  });

  it("a backup code signs in once (any case, with or without the dash), then never again", async () => {
    const u = (await createUser("MEMBER")) as U;
    const { codes } = await enableMfa(u);
    const typed = codes[0]!.toLowerCase().replace("-", " ");

    const ok = await api().post("/api/v1/auth/verify-mfa").send({ mfaChallengeToken: await challenge(u.email), backupCode: typed });
    expect(ok.status).toBe(200);
    expect(ok.body.data.accessToken).toEqual(expect.any(String));

    const again = await api().post("/api/v1/auth/verify-mfa").send({ mfaChallengeToken: await challenge(u.email), backupCode: codes[0] });
    expect(again.status).toBe(401);
    expect(again.body.message).toMatch(/already been used/);

    expect(await prisma.mfaBackupCode.count({ where: { userId: u.id, usedAt: null } })).toBe(7);
    const log = await prisma.auditLog.findFirstOrThrow({ where: { actorId: u.id, action: "MFA_BACKUP_CODE_USED" } });
    expect(log.metadata).toMatchObject({ remaining: 7 });
  });

  it("the second step takes exactly one of: app code, backup code", async () => {
    const u = (await createUser("MEMBER")) as U;
    const { secret, codes } = await enableMfa(u);
    const token = await challenge(u.email);
    expect((await api().post("/api/v1/auth/verify-mfa").send({ mfaChallengeToken: token })).status).toBe(422);
    expect(
      (await api().post("/api/v1/auth/verify-mfa").send({ mfaChallengeToken: token, totpCode: authenticator.generate(secret), backupCode: codes[0] })).status
    ).toBe(422);
  });

  it("new backup codes need a current app code, and replace the old ones", async () => {
    const u = (await createUser("MEMBER")) as U;
    const { secret, codes: old } = await enableMfa(u);
    expect((await api().post("/api/v1/auth/mfa/backup-codes").set(bearer(u)).send({ totpCode: "000000" })).status).toBe(422);

    const res = await api().post("/api/v1/auth/mfa/backup-codes").set(bearer(u)).send({ totpCode: authenticator.generate(secret) });
    expect(res.status).toBe(200);
    const fresh: string[] = res.body.data.backupCodes;
    expect(fresh).toHaveLength(8);

    expect((await api().post("/api/v1/auth/verify-mfa").send({ mfaChallengeToken: await challenge(u.email), backupCode: old[0] })).status).toBe(401);
    expect((await api().post("/api/v1/auth/verify-mfa").send({ mfaChallengeToken: await challenge(u.email), backupCode: fresh[0] })).status).toBe(200);
  });
});

describe("turning two-factor off", () => {
  it("a member can turn it off with their password and a current code", async () => {
    const u = (await createUser("MEMBER")) as U;
    const { secret } = await enableMfa(u);

    const badPassword = await api().post("/api/v1/auth/mfa/disable").set(bearer(u)).send({ password: "WrongPass1", totpCode: authenticator.generate(secret) });
    expect(badPassword.status).toBe(422);
    const badCode = await api().post("/api/v1/auth/mfa/disable").set(bearer(u)).send({ password: TEST_PASSWORD, totpCode: "000000" });
    expect(badCode.status).toBe(422);

    const ok = await api().post("/api/v1/auth/mfa/disable").set(bearer(u)).send({ password: TEST_PASSWORD, totpCode: authenticator.generate(secret) });
    expect(ok.status).toBe(200);

    const row = await prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row).toMatchObject({ mfaEnabled: false, totpSecret: null });
    expect(await prisma.mfaBackupCode.count({ where: { userId: u.id } })).toBe(0);
    const login = await api().post("/api/v1/auth/login").send({ email: u.email, password: TEST_PASSWORD });
    expect(login.body.data.accessToken).toEqual(expect.any(String));
    expect(await prisma.auditLog.count({ where: { actorId: u.id, action: "MFA_DISABLED" } })).toBe(1);
  });

  it("staff cannot turn it off", async () => {
    for (const role of ["ELECTION_OFFICER", "AUDITOR"] as const) {
      const u = (await createUser(role)) as U;
      const { secret } = await enableMfa(u);
      const res = await api().post("/api/v1/auth/mfa/disable").set(bearer(u)).send({ password: TEST_PASSWORD, totpCode: authenticator.generate(secret) });
      expect(res.status).toBe(403);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).mfaEnabled).toBe(true);
    }
  });
});

describe("profile", () => {
  it("returns the signed-in user's own details, never secrets", async () => {
    const u = await createUser("MEMBER", { fullName: "Jane Wambui" });
    await prisma.user.update({ where: { id: u.id }, data: { branch: "Nyeri", phoneNumber: "+254700000001", membershipStatus: "ACTIVE" } });
    const res = await api().get("/api/v1/auth/profile").set(bearer(u));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: u.id, fullName: "Jane Wambui", branch: "Nyeri", phoneNumber: "+254700000001",
      membershipStatus: "ACTIVE", mfaEnabled: false, backupCodesRemaining: null, mfaRequired: false,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|totpSecret|nationalId|codeHash/);
    expect((await api().get("/api/v1/auth/profile")).status).toBe(401);
  });

  it("marks two-factor as required for staff", async () => {
    const u = await createUser("ELECTION_OFFICER");
    expect((await api().get("/api/v1/auth/profile").set(bearer(u))).body.data.mfaRequired).toBe(true);
  });
});