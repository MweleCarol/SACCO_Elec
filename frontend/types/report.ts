export type ReportType = "ELECTION_AUDIT" | "ADMINISTRATIVE_ACTIVITY";

// Represents a single report
export interface Report {
  id: string;
  title: string;
  subtitle: string;
  type: ReportType;
  generatedAt: string; // ISO date string
}