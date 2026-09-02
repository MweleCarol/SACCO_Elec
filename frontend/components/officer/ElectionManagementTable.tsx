"use client";
// ElectionManagementTable.tsx
import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { mockElections, getComputedLifecycleStatus, getDisplayStatus, submitElectionForApproval } from "@/services/mock/elections";
import { getCandidatesByElection } from "@/services/mock/candidates";
import { requestApproval, getApprovalsForTarget } from "@/services/mock/approvals";
import { useCurrentMember } from "@/hooks/useCurrentMember";

export function ElectionManagementTable() {
  const { member } = useCurrentMember();
  const [confirming, setConfirming] = useState<{ electionId: string; type: "ELECTION_ACTIVATION" | "ELECTION_CLOSURE"; label: string } | null>(null);
  const [, rerender] = useState(0);

  function handleConfirm() {
    if (confirming && member) {
      if (confirming.type === "ELECTION_ACTIVATION") {
        // Moves DRAFT -> PENDING_APPROVAL, then opens the DAT request for that activation.
        submitElectionForApproval(confirming.electionId);
      }
      requestApproval(confirming.type, confirming.electionId, confirming.label, member.name);
    }
    setConfirming(null);
    rerender((n) => n + 1);
  }

  return (
    <div className="space-y-3">
      {mockElections.map((election) => {
        const lifecycle = getComputedLifecycleStatus(election);
        const pendingRequest = getApprovalsForTarget(election.id).find((a) => a.status === "PENDING");

        return (
          <div key={election.id} className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <p className="font-bold text-[var(--sevs-navy)]">{election.title}</p>
              <p className="mt-1 text-xs text-[var(--sevs-text-muted)]">
                {getCandidatesByElection(election.id).length} candidates · {election.positions.length} positions
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:shrink-0">
              <StatusBadge status={getDisplayStatus(election)} />
              <Link href={`/elections/${election.id}`} className="text-sm font-bold text-[var(--sevs-navy)] hover:underline">
                {election.approvalStatus === "DRAFT" ? "Configure" : "View"}
              </Link>
              {pendingRequest ? (
                <span className="text-xs font-semibold text-amber-600">Approval pending</span>
              ) : election.approvalStatus === "DRAFT" ? (
                <button
                  onClick={() => setConfirming({ electionId: election.id, type: "ELECTION_ACTIVATION", label: election.title })}
                  className="rounded-lg bg-[var(--sevs-navy)] px-3 py-2 text-xs font-bold text-white"
                >
                  Submit for Approval
                </button>
              ) : lifecycle === "ACTIVE" ? (
                <button
                  onClick={() => setConfirming({ electionId: election.id, type: "ELECTION_CLOSURE", label: election.title })}
                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600"
                >
                  Request Early Closure
                </button>
              ) : null}
            </div>
          </div>
        );
      })}

      {confirming && (
        <ConfirmDialog
          title={confirming.type === "ELECTION_ACTIVATION" ? "Submit for approval?" : "Request early closure?"}
          message={
            confirming.type === "ELECTION_ACTIVATION"
              ? "This submits the election for Distributed Administration Trust approval. It becomes SCHEDULED only once both required approvals are recorded on the Approvals page."
              : "This creates a Distributed Administration Trust request. The election only closes once both required approvals are recorded on the Approvals page."
          }
          confirmLabel="Submit Request"
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}