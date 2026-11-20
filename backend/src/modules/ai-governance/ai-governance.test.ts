import { prisma } from "../../config/prisma";
import { computeAuditHash } from "../../shared/utils/hash";
import { api, bearer, createOpenElection, createUser } from "../../../tests/helpers";

// The Copilot must never reach the real Gemini API in tests. The mock records
// exactly what would have been sent, so the test can prove no ballot data leaves.
const generateContent = jest.fn();
jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({ models: { generateContent } })),
}));
jest.mock("../../config/env", () => {
  const actual = jest.requireActual("../../config/env");
  return { ...actual, env: { ...actual.env, GEMINI_API_KEY: "test-key-not-real" } };
});

// Inserts an audit row at a chosen time (the scan only reads these rows).
let seq = 0;
async function auditAt(action: string, createdAt: Date, extra: Partial<{ actorId: string | null; resourceId: string; metadata: object }> = {}) {
  const h = computeAuditHash({
    actorId: extra.actorId ?? null, action, resourceType: "Election", resourceId: extra.resourceId ?? null,
    electionId: null, outcome: "SUCCESS", metadata: extra.metadata ?? null, createdAt: createdAt.toISOString(), previousHash: String(seq++),
  });
  return prisma.auditLog.create({
    data: {
      actorId: extra.actorId ?? null, action, resourceType: "Election", resourceId: extra.resourceId, outcome: "SUCCESS",
      metadata: extra.metadata as never, previousHash: "x", currentHash: h, createdAt,
    },
  });
}

const ago = (ms: number) => new Date(Date.now() - ms);
const MIN = 60_000;

describe("governance scan", () => {
  it("3 failed logins in 10 minutes raise one HIGH insight; acknowledging changes nothing else", async () => {
    const admin = await createUser("ELECTION_ADMINISTRATOR");
    const victim = await createUser("MEMBER");
    for (let i = 0; i < 3; i++) {
      expect((await api().post("/api/v1/auth/login").send({ email: victim.email, password: "WrongPass123" })).status).toBe(401);
    }
    expect((await api().post("/api/v1/governance/insights/scan").set(bearer(admin))).status).toBe(200);
    // A second scan does not duplicate it.
    await api().post("/api/v1/governance/insights/scan").set(bearer(admin));

    const list = await api().get("/api/v1/governance/insights?riskLevel=HIGH").set(bearer(await createUser("AUDITOR")));
    expect(list.body.data.insights).toHaveLength(1);
    const insight = list.body.data.insights[0];
    expect(insight).toMatchObject({ eventType: "RAPID_FAILED_LOGINS", resourceId: victim.id });

    const officer = await createUser("ELECTION_OFFICER");
    const ack = await api().post(`/api/v1/governance/insights/${insight.id}/acknowledge`).set(bearer(officer));
    expect(ack.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: victim.id } })).status).toBe("ACTIVE");

    expect((await api().get("/api/v1/governance/insights?acknowledgedOnly=true").set(bearer(officer))).body.data.insights).toHaveLength(1);
    expect((await api().get("/api/v1/governance/insights?acknowledgedOnly=false").set(bearer(officer))).body.data.insights).toHaveLength(0);
    expect((await api().get("/api/v1/governance/insights?acknowledgedOnly=yes").set(bearer(officer))).status).toBe(422);
  });

  it("flags a fast decision on the same request, and not a decision that belongs to an earlier request", async () => {
    const admin = await createUser("ELECTION_ADMINISTRATOR");
    const electionA = "11111111-1111-4111-8111-111111111111";
    const electionB = "22222222-2222-4222-8222-222222222222";
    // Election A: request 1 decided after 5 minutes (normal), then request 2 opened and still pending.
    await auditAt("APPROVAL_REQUESTED", ago(60 * MIN), { resourceId: electionA, metadata: { approvalRequestId: "r1" } });
    await auditAt("APPROVAL_DECIDED", ago(55 * MIN), { resourceId: electionA, metadata: { approvalRequestId: "r1" } });
    await auditAt("APPROVAL_REQUESTED", ago(50 * MIN), { resourceId: electionA, metadata: { approvalRequestId: "r2" } });
    // Election B: decided 10 seconds after the request.
    await auditAt("APPROVAL_REQUESTED", ago(30 * MIN), { resourceId: electionB, metadata: { approvalRequestId: "r3" } });
    await auditAt("APPROVAL_DECIDED", new Date(ago(30 * MIN).getTime() + 10_000), { resourceId: electionB, metadata: { approvalRequestId: "r3" } });

    await api().post("/api/v1/governance/insights/scan").set(bearer(admin));
    const fast = await prisma.aIInsight.findMany({ where: { eventType: "FAST_APPROVAL" } });
    expect(fast.map((f) => f.resourceId)).toEqual([electionB]);
  });

  it("off-hours uses the SACCO time zone (Africa/Nairobi by default), not UTC", async () => {
    const admin = await createUser("ELECTION_ADMINISTRATOR");
    // 04:00 UTC = 07:00 Nairobi (normal); 21:30 UTC = 00:30 Nairobi (off-hours).
    const atUtcHour = (h: number, m = 0) => {
      const d = new Date();
      d.setUTCHours(h, m, 0, 0);
      if (d.getTime() > Date.now()) d.setUTCDate(d.getUTCDate() - 1);
      return d;
    };
    const morning = await auditAt("ELECTION_ACTIVATED", atUtcHour(4));
    const midnight = await auditAt("RESULTS_PUBLISHED", atUtcHour(21, 30));
    await api().post("/api/v1/governance/insights/scan").set(bearer(admin));
    const flagged = (await prisma.aIInsight.findMany({ where: { eventType: "OFF_HOURS_ACTIVITY" } })).map((i) => i.resourceId);
    expect(flagged).toContain(midnight.id);
    expect(flagged).not.toContain(morning.id);
  });

  it("role gating: scan is admin-only; members cannot read insights", async () => {
    expect((await api().post("/api/v1/governance/insights/scan").set(bearer(await createUser("ELECTION_OFFICER")))).status).toBe(403);
    expect((await api().get("/api/v1/governance/insights").set(bearer(await createUser("MEMBER")))).status).toBe(403);
    expect((await api().post("/api/v1/governance/insights/7e0f0f0f-1111-4f1b-9b2e-000000000000/acknowledge").set(bearer(await createUser("AUDITOR")))).status).toBe(403);
  });
});

describe("election report", () => {
  it("returns counts only, never vote counts", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const fx = await createOpenElection(officer.id);
    const m = await createUser("MEMBER");
    await api().post(`/api/v1/elections/${fx.election.id}/ballot`).set(bearer(m)).send({
      selections: [{ positionId: fx.chair.id, candidateId: fx.chairA.id }, { positionId: fx.treasurer.id, candidateId: fx.treasA.id }],
    });
    const res = await api().get(`/api/v1/governance/reports/${fx.election.id}`).set(bearer(await createUser("AUDITOR")));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ positionCount: 2, candidateCount: 4, participationCount: 1 });
    expect(JSON.stringify(res.body)).not.toContain(fx.chairA.id);
  });
});

describe("copilot", () => {
  it("sends only aggregates to the model, with the guardrail prompt, and returns plain text", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    const fx = await createOpenElection(officer.id);
    const m = await createUser("MEMBER");
    await api().post(`/api/v1/elections/${fx.election.id}/ballot`).set(bearer(m)).send({
      selections: [{ positionId: fx.chair.id, candidateId: fx.chairA.id }, { positionId: fx.treasurer.id, candidateId: fx.treasA.id }],
    });
    generateContent.mockResolvedValue({ text: "**Summary**\n* One election is active." });

    const res = await api().post("/api/v1/governance/copilot/query").set(bearer(officer)).send({ question: "Who did members vote for?" });
    expect(res.status).toBe(200);
    expect(res.body.data.answer).toBe("Summary\n- One election is active.");
    expect(res.body.data.disclaimer).toMatch(/advisory/i);

    const sent = JSON.stringify(generateContent.mock.calls[0][0]);
    for (const secret of [fx.chairA.id, fx.treasA.id, m.id, "Alice", "Carol", "encryptedPayload", "anonymousToken"]) {
      expect(sent).not.toContain(secret);
    }
    expect(generateContent.mock.calls[0][0].config.systemInstruction).toMatch(/do NOT have access to ballot contents/);
  });

  it("validates input, enforces roles, and hides model errors", async () => {
    const officer = await createUser("ELECTION_OFFICER");
    expect((await api().post("/api/v1/governance/copilot/query").set(bearer(officer)).send({ question: "hi" })).status).toBe(422);
    for (const role of ["MEMBER", "AUDITOR"] as const) {
      expect((await api().post("/api/v1/governance/copilot/query").set(bearer(await createUser(role))).send({ question: "Status?" })).status).toBe(403);
    }
    generateContent.mockRejectedValue(new Error("upstream quota exceeded: key=abc"));
    const res = await api().post("/api/v1/governance/copilot/query").set(bearer(officer)).send({ question: "Status please" });
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toMatch(/quota|key=/);
  });
});