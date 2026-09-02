"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Approval } from "@/types/approval";
import { decideStage, getCurrentStageIndex } from "@/services/mock/approvals";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DatBadge } from "@/components/officer/DatBadge";

interface ApprovalReviewSheetProps {
  approval: Approval;
  actingRole: "ELECTION_OFFICER" | "ADMINISTRATOR";
  actingName: string;
  onClose: () => void;
  onDecided: () => void;
}

export function ApprovalReviewSheet({ approval, actingRole, actingName, onClose, onDecided }: ApprovalReviewSheetProps) {
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState<"APPROVED" | "REJECTED" | null>(null);

  const stageIndex = getCurrentStageIndex(approval);
  const canAct = stageIndex !== -1 && approval.stages[stageIndex].role === actingRole;

  function handleConfirm() {
    if (confirming) decideStage(approval.id, actingRole, confirming, actingName, reason || undefined);
    setConfirming(null);
    onDecided();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-[var(--sevs-bg)] shadow-xl sm:rounded-l-3xl">
        <div className="flex items-center justify-between border-b border-[var(--sevs-border)] bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate font-bold text-[var(--sevs-navy)]">{approval.targetLabel}</h2>
            <p className="text-xs text-[var(--sevs-text-muted)]">
              {approval.type.replace(/_/g, " ")} · Requested by {approval.requestedBy}
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-gray-400" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-[var(--sevs-navy)]">Approval Progress</p>
              <DatBadge approval={approval} />
            </div>
            <div className="space-y-3">
              {approval.stages.map((stage, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      stage.status === "APPROVED" ? "bg-green-100 text-green-700"
                      : stage.status === "REJECTED" ? "bg-red-100 text-red-700"
                      : i === stageIndex ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--sevs-text-body)]">
                      {stage.role === "ELECTION_OFFICER" ? "Election Officer" : "Administrator"}
                    </p>
                    {stage.approverName && (
                      <p className="text-xs text-[var(--sevs-text-muted)]">
                        {stage.approverName} · {stage.status.toLowerCase()}
                        {stage.decidedAt && ` · ${new Date(stage.decidedAt).toLocaleDateString()}`}
                      </p>
                    )}
                    {stage.reason && <p className="mt-0.5 text-xs italic text-[var(--sevs-text-muted)]">&ldquo;{stage.reason}&rdquo;</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!canAct && (
            <p className="rounded-lg bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-700">
              {stageIndex === -1
                ? "This approval has been fully resolved."
                : `Awaiting the ${approval.stages[stageIndex].role === "ELECTION_OFFICER" ? "Election Officer" : "Administrator"} stage — you cannot act on this yet.`}
            </p>
          )}

          {canAct && (
            <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4">
              <label className="text-xs font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
                Notes (required if rejecting)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Record your reasoning for the audit trail..."
                className="mt-2 w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm focus:border-[var(--sevs-navy)] focus:outline-none"
              />
            </div>
          )}
        </div>

        {canAct && (
          <div className="flex gap-3 border-t border-[var(--sevs-border)] bg-white p-4 sm:p-5">
            <button
              onClick={() => setConfirming("REJECTED")}
              disabled={!reason.trim()}
              className="flex-1 rounded-lg border border-red-200 py-2.5 text-sm font-bold text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reject
            </button>
            <button
              onClick={() => setConfirming("APPROVED")}
              className="flex-1 rounded-lg bg-[var(--sevs-navy)] py-2.5 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
            >
              Approve My Stage
            </button>
          </div>
        )}
      </div>

      {confirming && (
        <ConfirmDialog
          title={confirming === "APPROVED" ? "Approve your stage?" : "Reject this request?"}
          message={
            confirming === "APPROVED"
              ? "This records your approval. If another stage remains, the request stays pending until it's resolved."
              : "Rejecting at your stage ends this approval request entirely. This is recorded in the audit log."
          }
          confirmLabel={confirming === "APPROVED" ? "Approve" : "Reject"}
          tone={confirming === "REJECTED" ? "danger" : "default"}
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}