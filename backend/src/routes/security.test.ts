import { prisma } from "../config/prisma";
import { api, bearer, createUser } from "../../tests/helpers";

// Every state-changing endpoint, with a well-formed but non-existent id. The
// role check runs before validation and before any lookup, so a refused role
// must get 403 whatever the id or body.
const ID = "9b2e1f1a-4444-4d4d-8e8e-000000000000";
const MUTATING: [method: "post" | "patch" | "delete", path: string][] = [
  ["post", "/api/v1/users"],
  ["patch", `/api/v1/users/${ID}`],
  ["post", "/api/v1/membership-sync/run"],
  ["post", "/api/v1/elections"],
  ["patch", `/api/v1/elections/${ID}`],
  ["post", `/api/v1/elections/${ID}/submit-approval`],
  ["post", `/api/v1/elections/${ID}/review-approval`],
  ["post", `/api/v1/elections/${ID}/activate`],
  ["post", `/api/v1/elections/${ID}/close`],
  ["post", `/api/v1/elections/${ID}/cancel`],
  ["post", `/api/v1/elections/${ID}/reschedule`],
  ["post", `/api/v1/elections/${ID}/positions`],
  ["patch", `/api/v1/positions/${ID}`],
  ["delete", `/api/v1/positions/${ID}`],
  ["post", `/api/v1/elections/${ID}/candidates`],
  ["patch", `/api/v1/candidates/${ID}`],
  ["post", `/api/v1/candidates/${ID}/approve`],
  ["post", `/api/v1/candidates/${ID}/reject`],
  ["post", `/api/v1/approval-requests/${ID}/decide`],
  ["post", `/api/v1/elections/${ID}/results/tally`],
  ["post", `/api/v1/elections/${ID}/results/publish`],
  ["post", "/api/v1/governance/insights/scan"],
  ["post", `/api/v1/governance/insights/${ID}/acknowledge`],
  ["post", "/api/v1/governance/copilot/query"],
];

describe("role boundaries across the whole API", () => {
  it.each(["AUDITOR", "MEMBER"] as const)("%s is refused (403) on every administrative write endpoint", async (role) => {
    const u = await createUser(role);
    const failures: string[] = [];
    for (const [method, path] of MUTATING) {
      const res = await api()[method](path).set(bearer(u)).send({});
      if (res.status !== 403) failures.push(`${method.toUpperCase()} ${path} -> ${res.status}`);
    }
    expect(failures).toEqual([]);
  });

  it("an auditor cannot vote and members cannot read the audit trail or approvals", async () => {
    const auditor = await createUser("AUDITOR");
    const member = await createUser("MEMBER");
    expect((await api().post(`/api/v1/elections/${ID}/ballot`).set(bearer(auditor)).send({ selections: [] })).status).toBe(403);
    expect((await api().get("/api/v1/audit-logs").set(bearer(member))).status).toBe(403);
    expect((await api().get("/api/v1/approval-requests").set(bearer(member))).status).toBe(403);
  });

  it("an officer cannot do administrator-only things", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    for (const [method, path] of [
      ["post", "/api/v1/users"], ["patch", `/api/v1/users/${ID}`], ["post", "/api/v1/membership-sync/run"],
      ["post", `/api/v1/elections/${ID}/review-approval`], ["post", `/api/v1/elections/${ID}/cancel`],
      ["post", "/api/v1/governance/insights/scan"],
    ] as const) {
      expect((await api()[method](path).set(bearer(officer)).send({})).status).toBe(403);
    }
  });

  it("no endpoint changes data without a token", async () => {
    for (const [method, path] of MUTATING) {
      expect((await api()[method](path).send({})).status).toBe(401);
    }
    expect(await prisma.election.count()).toBe(0);
  });

  it("error responses use the standard envelope and never leak stack traces", async () => {
    const res = await api().get("/api/v1/elections/not-a-uuid").set(bearer(await createUser("MEMBER")));
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ success: false, message: expect.any(String), errors: expect.any(Array) });
    const bad = await api().post("/api/v1/auth/login").set("Content-Type", "application/json").send("{not json");
    expect(bad.status).toBe(400);
    expect(bad.body).toEqual({ success: false, message: "Request body is not valid JSON." });
    const huge = await api().post("/api/v1/auth/login").send({ email: "a@b.co", password: "x".repeat(1_100_000) });
    expect(huge.status).toBe(413);
    expect(JSON.stringify(bad.body)).not.toMatch(/at .*\.js|stack|SyntaxError/);
  });
});