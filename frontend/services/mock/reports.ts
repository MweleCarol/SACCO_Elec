import type { Report } from "@/types/report";

export const mockReports: Report[] = [
  {
    id: "rep-001",
    title: "Election Audit Report",
    subtitle: "2026 SACCO General Election",
    type: "ELECTION_AUDIT",
    generatedAt: "2026-08-28T09:00:00Z",
  },
  {
    id: "rep-002",
    title: "Election Audit Report",
    subtitle: "Branch Delegate Election 2026",
    type: "ELECTION_AUDIT",
    generatedAt: "2026-08-27T09:00:00Z",
  },
  {
    id: "rep-003",
    title: "Administrative Activity Report",
    subtitle: "August 2026",
    type: "ADMINISTRATIVE_ACTIVITY",
    generatedAt: "2026-08-28T07:00:00Z",
  },
];

export function getReportsCount(): number {
  return mockReports.length;
}