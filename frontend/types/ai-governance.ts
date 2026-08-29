// types/ai-governance.ts

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskAssessment {
  id: string;
  electionId: string; // Election.id
  level: RiskLevel;
  score: number; // 0-100, internal detail behind the level label
  summary: string;
  factors: string[];
  generatedAt: string; // ISO date string
}

export interface Anomaly {
  id: string;
  title: string;
  description: string;
  severity: RiskLevel;
  relatedModule: "ELECTIONS" | "CANDIDATES" | "APPROVALS" | "VOTING" | "USERS";
  detectedAt: string; // ISO date string
  status: "OPEN" | "REVIEWED" | "DISMISSED";
  explainability: {
    evidence: string[];
    recommendedAction: string;
  };
}

export interface CopilotMessage {
  id: string;
  role: "OFFICER" | "COPILOT";
  content: string;
  timestamp: string; // ISO date string
}