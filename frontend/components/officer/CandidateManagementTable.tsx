"use client";

import type { Candidate } from "@/types/candidate";
import { getApprovalsForTarget } from "@/services/mock/approvals";
import { getCandidateDisplayStatus } from "@/services/mock/candidates";
import { mockElections } from "@/services/mock/elections";
import { DatBadge } from "@/components/officer/DatBadge";

interface CandidateManagementTableProps {
  candidates: Candidate[];
  selectedId?: string;
  onSelect: (candidate: Candidate) => void;
}

const STATUS_STYLES: Record<string, string> = {
  "Pending Review": "bg-gray-100 text-gray-600",
  "Awaiting Approval": "bg-amber-50 text-amber-700",
  Approved: "bg-green-50 text-green-700",
  Rejected: "bg-red-50 text-red-700",
};

export function CandidateManagementTable({ candidates, selectedId, onSelect }: CandidateManagementTableProps) {
  return (
    <div className="hidden overflow-x-auto rounded-2xl border border-[var(--sevs-border)] bg-white shadow-sm sm:block">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--sevs-border)] text-xs uppercase tracking-wide text-[var(--sevs-text-muted)]">
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Position</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">DAT Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--sevs-border)]">
          {candidates.map((c) => {
            const election = mockElections.find((e) => e.id === c.electionId);
            const position = election?.positions.find((p) => p.id === c.positionId);
            const approval = getApprovalsForTarget(c.id).find((a) => a.status === "PENDING" || a.status === "APPROVED");
            const displayStatus = getCandidateDisplayStatus(c.id, Boolean(approval && approval.status === "PENDING"));

            return (
              <tr
                key={c.id}
                onClick={() => onSelect(c)}
                className={`cursor-pointer hover:bg-[var(--sevs-bg)] ${selectedId === c.id ? "bg-[var(--sevs-bg)]" : ""}`}
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-[var(--sevs-navy)]">{c.name}</p>
                  <p className="text-xs text-[var(--sevs-text-muted)]">{c.id}</p>
                </td>
                <td className="px-4 py-3 text-[var(--sevs-text-body)]">{position?.title ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[displayStatus]}`}>
                    {displayStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {approval ? <DatBadge approval={approval} /> : <span className="text-xs text-[var(--sevs-text-muted)]">—</span>}
                </td>
              </tr>
            );
          })}
          {candidates.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-sm text-[var(--sevs-text-muted)]">No candidates match.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}