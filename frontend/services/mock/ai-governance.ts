import type { RiskLevel, RiskAssessment, Anomaly, CopilotMessage } from "../../types/ai-governance";

export const mockRiskAssessment: RiskAssessment = {
  id: "risk-2026-08-28",
  electionId: "el-2026-general",
  level: "MEDIUM",
  score: 54,
  summary: "Administrative activity requires review.",
  factors: [
    "Unusual clustering of candidate approvals within a short time window",
    "One approval action taken outside typical officer working hours",
    "Slight deviation from historical voter turnout pace",
  ],
  generatedAt: "2026-08-28T09:56:00Z",
};

export const mockAnomalies: Anomaly[] = [
  {
    id: "anom-001",
    title: "Rapid sequential candidate approvals",
    description:
      "Three candidate approvals were recorded by the same officer within a 4-minute window, faster than the typical review pace.",
    severity: "MEDIUM",
    relatedModule: "CANDIDATES",
    detectedAt: "2026-08-28T09:40:00Z",
    status: "OPEN",
    explainability: {
      evidence: [
        "Average historical review time per candidate: 6.5 minutes",
        "Observed review time for this batch: 1.3 minutes average",
      ],
      recommendedAction: "Flag for secondary officer review before election activation.",
    },
  },
  {
    id: "anom-002",
    title: "Off-hours approval action",
    description: "An election action approval was logged at 23:47, outside the officer's usual activity hours.",
    severity: "LOW",
    relatedModule: "APPROVALS",
    detectedAt: "2026-08-27T23:47:00Z",
    status: "OPEN",
    explainability: {
      evidence: ["Officer's typical activity window: 07:00–19:00", "Action timestamp: 23:47"],
      recommendedAction: "Confirm action with officer; no automatic reversal performed.",
    },
  },
  {
    id: "anom-003",
    title: "Turnout pace deviation",
    description:
      "Voting pace for Branch Delegate Election 2026 is tracking 18% below the pace observed at the same point in prior elections.",
    severity: "LOW",
    relatedModule: "VOTING",
    detectedAt: "2026-08-28T09:56:00Z",
    status: "OPEN",
    explainability: {
      evidence: ["Historical average turnout at 24h mark: 34%", "Current turnout at 24h mark: 28.6%"],
      recommendedAction: "Consider a reminder notification to eligible non-voters.",
    },
  },
];

// Seed messages for the Officer Copilot chat panel (mock async responses for now)
export const mockCopilotThread: CopilotMessage[] = [
  {
    id: "msg-001",
    role: "OFFICER",
    content: "Summarize today's anomalies for the general election.",
    timestamp: "2026-08-28T10:00:00Z",
  },
  {
    id: "msg-002",
    role: "COPILOT",
    content:
      "Three anomalies detected: rapid sequential candidate approvals, one off-hours approval, and a turnout pace deviation. Overall administrative risk is MEDIUM. No autonomous action was taken — all items are queued for your review.",
    timestamp: "2026-08-28T10:00:04Z",
  },
];

/**
 * Mock async "AI response" so the ChatPanel component can be built and tested
 * before the real backend Copilot endpoint exists.
 */
export async function mockCopilotReply(userMessage: string): Promise<CopilotMessage> {
  await new Promise((resolve) => setTimeout(resolve, 700)); // simulate network latency
  return {
    id: `msg-${Date.now()}`,
    role: "COPILOT",
    content: `This is a mock response. In production this will call the Election Officer Copilot endpoint. You asked: "${userMessage}"`,
    timestamp: new Date().toISOString(),
  };
}