import { api } from "@/services/api/axios";
import type { AIInsight, ApiSuccess, ChatTurn, CopilotAnswer, InsightList, RiskLevel } from "@/types/api";

// Staff Copilot (officers and administrators): operational aggregates only.
export async function askCopilot(question: string, history: ChatTurn[]): Promise<CopilotAnswer> {
  const res = await api.post<ApiSuccess<CopilotAnswer>>("/governance/copilot/query", { question, history });
  return res.data.data;
}

// Members' help assistant: public election information only.
export async function askAssistant(question: string, history: ChatTurn[]): Promise<CopilotAnswer> {
  const res = await api.post<ApiSuccess<CopilotAnswer>>("/governance/assistant/query", { question, history });
  return res.data.data;
}

export interface InsightFilters {
  riskLevel?: RiskLevel;
  // true = reviewed only, false = open only, undefined = all
  acknowledged?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listInsights(f: InsightFilters = {}): Promise<InsightList> {
  const res = await api.get<ApiSuccess<InsightList>>("/governance/insights", {
    params: {
      riskLevel: f.riskLevel,
      acknowledgedOnly: f.acknowledged === undefined ? undefined : String(f.acknowledged),
      page: f.page ?? 1,
      pageSize: f.pageSize ?? 10,
    },
  });
  return res.data.data;
}

export async function acknowledgeInsight(id: string): Promise<AIInsight> {
  const res = await api.post<ApiSuccess<AIInsight>>(`/governance/insights/${id}/acknowledge`, {});
  return res.data.data;
}

export async function runInsightScan(): Promise<{ scannedSince: string }> {
  const res = await api.post<ApiSuccess<{ scannedSince: string }>>("/governance/insights/scan", {});
  return res.data.data;
}