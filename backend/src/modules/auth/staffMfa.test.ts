import { authenticator } from "otplib";
import { api, bearer, createUser, TEST_PASSWORD } from "../../../tests/helpers";

describe("staff must set up two-factor", () => {
  it("a staff account without it signs in, but can only reach its own account until it is set up", async () => {
    const officer = await createUser("ELECTION_OFFICER", { mfaEnabled: false });

    const login = await api().post("/api/v1/auth/login").send({ email: officer.email, password: TEST_PASSWORD });
    expect(login.status).toBe(200);
    expect(login.body.data.user.mfaSetupRequired).toBe(true);

    const blocked = await api().get("/api/v1/elections").set(bearer(officer));
    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toMatch(/Set up two-factor/);
    expect((await api().get("/api/v1/approval-requests").set(bearer(officer))).status).toBe(403);

    // Still allowed: own record, profile, and the setup itself.
    const me = await api().get("/api/v1/users/me").set(bearer(officer));
    expect(me.status).toBe(200);
    expect(me.body.data.mfaSetupRequired).toBe(true);
    expect((await api().get("/api/v1/auth/profile").set(bearer(officer))).status).toBe(200);
    expect((await api().patch("/api/v1/users/me").set(bearer(officer)).send({ fullName: "Changed Name" })).status).toBe(403);

    const enroll = await api().post("/api/v1/auth/mfa/enroll").set(bearer(officer));
    const confirm = await api()
      .post("/api/v1/auth/mfa/confirm").set(bearer(officer))
      .send({ totpCode: authenticator.generate(enroll.body.data.totpSecret) });
    expect(confirm.status).toBe(200);

    expect((await api().get("/api/v1/elections").set(bearer(officer))).status).toBe(200);
    expect((await api().get("/api/v1/users/me").set(bearer(officer))).body.data.mfaSetupRequired).toBe(false);
  });

  it("applies to every staff role, never to members", async () => {
    for (const role of ["ELECTION_ADMINISTRATOR", "AUDITOR"] as const) {
      const u = await createUser(role, { mfaEnabled: false });
      expect((await api().get("/api/v1/elections").set(bearer(u))).status).toBe(403);
    }
    const member = await createUser("MEMBER");
    expect((await api().get("/api/v1/elections").set(bearer(member))).status).toBe(200);
    expect((await api().get("/api/v1/users/me").set(bearer(member))).body.data.mfaSetupRequired).toBe(false);
  });
});

describe("DEV_SKIP_MFA", () => {
  const saved = { NODE_ENV: process.env.NODE_ENV, DEV_SKIP_MFA: process.env.DEV_SKIP_MFA };
  afterEach(() => {
    process.env.NODE_ENV = saved.NODE_ENV;
    if (saved.DEV_SKIP_MFA === undefined) delete process.env.DEV_SKIP_MFA;
    else process.env.DEV_SKIP_MFA = saved.DEV_SKIP_MFA;
    jest.restoreAllMocks();
  });

  function loadPolicy() {
    let policy!: typeof import("../../shared/utils/mfaPolicy");
    jest.isolateModules(() => {
      policy = jest.requireActual("../../shared/utils/mfaPolicy");
    });
    return policy;
  }

  it("works only when NODE_ENV is development", () => {
    process.env.DEV_SKIP_MFA = "true";
    process.env.NODE_ENV = "test";
    expect(loadPolicy().devSkipMfa).toBe(false);

    process.env.NODE_ENV = "development";
    const dev = loadPolicy();
    expect(dev.devSkipMfa).toBe(true);
    expect(dev.mfaSetupRequired({ role: "ELECTION_OFFICER", mfaEnabled: false })).toBe(false);
  });

  it("stops the server from starting in production", () => {
    process.env.DEV_SKIP_MFA = "true";
    process.env.NODE_ENV = "production";
    jest.spyOn(console, "error").mockImplementation(() => {});
    const exit = jest.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as never);
    expect(() => loadPolicy()).toThrow("exit");
    expect(exit).toHaveBeenCalledWith(1);
  });
});