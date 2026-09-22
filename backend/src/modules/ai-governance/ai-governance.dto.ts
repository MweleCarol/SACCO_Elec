import { AIInsight, RiskLevel } from "@prisma/client";

export interface AIInsightDto {
  id: string;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
  riskLevel: RiskLevel | null;
  recommendation: string;
  reasoning: string;
  evidence: unknown;
  confidence: number | null;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  createdAt: Date;
}

export function toAIInsightDto(insight: AIInsight): AIInsightDto {
  return {
    id: insight.id, eventType: insight.eventType, resourceType: insight.resourceType,
    resourceId: insight.resourceId, riskLevel: insight.riskLevel, recommendation: insight.recommendation,
    reasoning: insight.reasoning, evidence: insight.evidence, confidence: insight.confidence,
    acknowledgedBy: insight.acknowledgedBy, acknowledgedAt: insight.acknowledgedAt, createdAt: insight.createdAt,
  };
}

export interface CopilotResponseDto {
  answer: string;
  disclaimer: string;
}