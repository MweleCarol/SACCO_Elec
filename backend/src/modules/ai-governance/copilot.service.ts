import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors/AppError";
import * as repo from "./ai-governance.repository";
import { CopilotResponseDto } from "./ai-governance.dto";

const SYSTEM_PROMPT = `You are the SEVS Election Officer Copilot, an advisory assistant for election officers and administrators of a SACCO electronic voting system.

You are given a snapshot of permitted operational data below — election counts, recent audit activity, and open governance insights. You do NOT have access to ballot contents, individual votes, or any information about who voted for whom. This is by design: vote confidentiality is a strict architectural boundary in this system, not a gap in what you were told.

Rules you must follow:
- If asked anything about how a specific person voted, ballot contents, or vote tallies before official results are published, state plainly that you do not have access to that information and that it is deliberately withheld from you.
- You may summarize operational and administrative data provided below.
- You must never claim to determine, predict, or influence an election's outcome or winner.
- You are advisory only. Any recommendation you make requires human review — you cannot approve, reject, or execute anything.
- If the provided data doesn't contain what's needed to answer, say so rather than guessing.

Answer concisely and factually based only on the data provided below.`;

function buildContext(data: {
  electionCounts: Record<string, number>;
  auditOutcomes: Record<string, number>;
  openInsights: Record<string, number>;
  recentInsights: { eventType: string; riskLevel: string | null; recommendation: string; createdAt: Date }[];
}): string {
  return [
    `Elections by status: ${JSON.stringify(data.electionCounts)}`,
    `Audit outcomes in the last 7 days: ${JSON.stringify(data.auditOutcomes)}`,
    `Unacknowledged governance insights by risk level: ${JSON.stringify(data.openInsights)}`,
    `Most recent unacknowledged insights: ${data.recentInsights
      .map((i) => `[${i.riskLevel ?? "N/A"}] ${i.eventType}: ${i.recommendation} (${i.createdAt.toISOString()})`)
      .join("; ") || "none"}`,
  ].join("\n");
}

export async function askCopilot(question: string): Promise<CopilotResponseDto> {
  if (!env.GEMINI_API_KEY) {
    throw new AppError("The Copilot is not configured. Set GEMINI_API_KEY to enable it.", 503);
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [electionCounts, auditOutcomes, openInsights, recentInsights] = await Promise.all([
    repo.getElectionCountsByStatus(),
    repo.getRecentAuditOutcomeCounts(since),
    repo.getOpenInsightCountsByRisk(),
    repo.getRecentUnacknowledgedInsights(5),
  ]);

  const context = buildContext({ electionCounts, auditOutcomes, openInsights, recentInsights });

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(
    `Operational data snapshot:\n${context}\n\nQuestion: ${question}`
  );

  const answer = result.response.text();

  return {
    answer,
    disclaimer: "This response is advisory only, generated from permitted operational data. It has no access to ballot contents and cannot determine election outcomes.",
  };
}