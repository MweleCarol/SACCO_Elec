"use client";

import { X } from "lucide-react";
import type { Candidate } from "@/types/candidate";
import { mockElections } from "@/services/mock/elections";

interface OfficerCandidateDetailPanelProps {
  candidate: Candidate;
  onClose: () => void;
}

export function OfficerCandidateDetailPanel({
  candidate,
  onClose,
}: OfficerCandidateDetailPanelProps) {
  const election = mockElections.find((e) => e.id === candidate.electionId);
  const position = election?.positions.find(
    (p) => p.id === candidate.positionId,
  );

  const content = (
    <>
      <div className="flex items-center justify-between border-b border-[var(--sevs-border)] px-5 py-4">
        <h3 className="text-sm font-bold text-[var(--sevs-navy)]">
          Candidate Details
        </h3>
        <button onClick={onClose} aria-label="Close">
          <X className="h-5 w-5 text-[var(--sevs-text-muted)]" />
        </button>
      </div>
      <div className="p-5">
        <p className="font-bold text-[var(--sevs-navy)]">{candidate.name}</p>
        <p className="text-sm text-[var(--sevs-text-muted)]">
          {position?.title ?? "—"}
        </p>
        {/* Phase 5: info rows, checklist preview, DAT timeline, Approve/Reject */}
      </div>
    </>
  );

  return (
    <>
      <div className="hidden w-96 shrink-0 rounded-2xl border border-[var(--sevs-border)] bg-white shadow-sm lg:block">
        {content}
      </div>
      <div
        className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-lg lg:hidden">
        {content}
      </div>
    </>
  );
}
