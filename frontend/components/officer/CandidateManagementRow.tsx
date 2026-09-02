"use client";

import { useState } from "react";
import type { Candidate } from "@/types/candidate";
import { CandidateReviewSheet } from "@/components/officer/CandidateReviewSheet";
import { DatBadge } from "@/components/officer/DatBadge";
import { mockElections } from "@/services/mock/elections";
import { getApprovalsForTarget } from "@/services/mock/approvals";
import { getCandidateDisplayStatus } from "@/services/mock/candidates";
import { isReviewComplete } from "@/services/mock/candidate-review";

export function CandidateManagementRow({ candidate, onDecided }: { candidate: Candidate; onDecided: () => void }) {
  const [reviewing, setReviewing] = useState(false);
  const election = mockElections.find((e) => e.id === candidate.electionId);
  const position = election?.positions.find((p) => p.id === candidate.positionId);

  const approval = getApprovalsForTarget(candidate.id).find((a) => a.status === "PENDING" || a.status === "APPROVED");
  const displayStatus = getCandidateDisplayStatus(candidate.id, Boolean(approval && approval.status === "PENDING"));
  const verified = isReviewComplete(candidate.id);

  const STATUS_STYLES: Record<string, string> = {
    "Pending Review": "bg-gray-100 text-gray-600",
    "Awaiting Approval": "bg-amber-50 text-amber-700",
    Approved: "bg-green-50 text-green-700",
    Rejected: "bg-red-50 text-red-700",
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <p className="font-bold text-[var(--sevs-navy)]">{candidate.name}</p>
        <p className="mt-0.5 text-xs text-[var(--sevs-text-muted)]">
          {position?.title ?? "—"} · {election?.title ?? "—"}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className={verified ? "text-green-600" : "text-gray-400"}>
            {verified ? "✓ Verified" : "— Not verified"}
          </span>
          {approval && <DatBadge approval={approval} />}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[displayStatus]}`}>
          {displayStatus}
        </span>
        {candidate.status === "PENDING" && !approval && (
          <button
            onClick={() => setReviewing(true)}
            className="rounded-lg bg-[var(--sevs-navy)] px-3 py-2 text-xs font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
          >
            Review
          </button>
        )}
      </div>

      {reviewing && (
        <CandidateReviewSheet candidate={candidate} onClose={() => setReviewing(false)} onDecided={onDecided} />
      )}
    </div>
  );
}