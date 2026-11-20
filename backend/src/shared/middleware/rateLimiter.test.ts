import request from "supertest";
import type { Application } from "express";
import { createUser, TEST_PASSWORD } from "../../../tests/helpers";

// The rest of the suite runs with a very high auth limit. This file loads a
// fresh copy of the app with the real default of 10, so the limiter itself is
// what gets tested.
function appWithLimit(limit: string): Application {
  let app: Application | undefined;
  jest.isolateModules(() => {
    process.env.AUTH_RATE_LIMIT_MAX = limit;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    app = require("../../app").createApp();
  });
  return app!;
}

describe("auth rate limiter (per IP)", () => {
  // Regression for K2: successful logins used up the budget.
  it("does not count successful logins", async () => {
    const app = appWithLimit("10");
    const u = await createUser("AUDITOR");
    for (let i = 0; i < 15; i++) {
      const res = await request(app).post("/api/v1/auth/login").send({ email: u.email, password: TEST_PASSWORD });
      expect(res.status).toBe(200);
    }
  });

    // Regression: every logged-out page load calls /auth/refresh, which fails
  // without a cookie. Those failures must not use up the login budget.
  it("failed refresh calls (logged-out page loads) do not block logins", async () => {
    const app = appWithLimit("10");
    const u = await createUser("AUDITOR");
    for (let i = 0; i < 15; i++) {
      expect((await request(app).post("/api/v1/auth/refresh").send({})).status).toBe(401);
    }
    const res = await request(app).post("/api/v1/auth/login").send({ email: u.email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
  });

  it("blocks the 11th failed attempt from one IP with the per-IP message", async () => {
    const app = appWithLimit("10");
    const statuses: number[] = [];
    // Different unknown emails, so the per-account lockout is not what fires.
    for (let i = 0; i < 11; i++) {
      const res = await request(app).post("/api/v1/auth/login").send({ email: `nobody${i}@test.local`, password: "WrongPass123" });
      statuses.push(res.status);
      if (i === 10) expect(res.body.message).toBe("Too many attempts. Please wait before trying again.");
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});