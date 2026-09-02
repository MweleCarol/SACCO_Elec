"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DatBadge } from "@/components/officer/DatBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { getElectionById, getComputedLifecycleStatus, getDisplayStatus, submitElectionForApproval } from "@/services/mock/elections";
import { getCandidatesByElection } from "@/services/mock/candidates";
import { getApprovalsForTarget, requestApproval, formatApprovalType } from "@/services/mock/approvals";
import { getAuditEventCountForElection, getElectionActivityTimeline } from "@/services/mock/audit-logs";

export default function ElectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { member, isLoading } = useCurrentMember();
  const [confirming, setConfirming] = useState<"ELECTION_ACTIVATION" | "ELECTION_CLOSURE" | null>(null);
  const [, rerender] = useState(0);

  if (isLoading) return null;
  if (!member || !["ELECTION_OFFICER", "ADMINISTRATOR", "AUDITOR"].includes(member.role)) {
    return <div className="p-8"><p className="text-[var(--sevs-text-muted)]">You don&apos;t have access to this page.</p></div>;
  }

  const election = getElectionById(id);
  if (!election) {
    return <div className="p-8"><p className="text-[var(--sevs-text-muted)]">Election not found.</p></div>;
  }

  const isReadOnly = member.role === "AUDITOR";
  const lifecycle = getComputedLifecycleStatus(election);
  const candidates = getCandidatesByElection(election.id);
  const approvals = getApprovalsForTarget(election.id);
  const pendingApproval = approvals.find((a) => a.status === "PENDING");
  const timeline = getElectionActivityTimeline(election.id);

  function handleConfirm() {
    if (!election || !member) return; // re-narrows for TS inside this closure
    if (confirming) {
      if (confirming === "ELECTION_ACTIVATION") {
        submitElectionForApproval(election.id);
      }
      requestApproval(confirming, election.id, election.title, member.name);
    }
    setConfirming(null);
    rerender((n) => n + 1);
  }

  return (
    <>
      <Topbar title={election.title} subtitle="Election details and management" />

      <div className="space-y-6 p-4 sm:p-8">
        {isReadOnly && (
          <p className="rounded-lg bg-blue-50 px-4 py-2.5 text-xs font-medium text-blue-700">
            Auditor access is read-only — no actions can be taken on this page.
          </p>
        )}

        {/* Election information */}
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[var(--sevs-navy)]">{election.title}</h2>
            <StatusBadge status={getDisplayStatus(election)} />
          </div>
          <p className="mt-2 text-sm text-[var(--sevs-text-body)]">{election.description}</p>
          <dl className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-xs uppercase text-[var(--sevs-text-muted)]">Start Date</dt><dd className="mt-1 font-medium text-[var(--sevs-text-body)]">{new Date(election.startDate).toLocaleString()}</dd></div>
            <div><dt className="text-xs uppercase text-[var(--sevs-text-muted)]">End Date</dt><dd className="mt-1 font-medium text-[var(--sevs-text-body)]">{new Date(election.endDate).toLocaleString()}</dd></div>
            <div><dt className="text-xs uppercase text-[var(--sevs-text-muted)]">Eligible Voters</dt><dd className="mt-1 font-medium text-[var(--sevs-text-body)]">{election.totalEligibleVoters.toLocaleString()}</dd></div>
          </dl>
        </div>

        {/* Positions */}
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Positions</h3>
          <div className="space-y-2">
            {election.positions.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-[var(--sevs-text-body)]">{p.title}</span>
                <span className="text-[var(--sevs-text-muted)]">{p.seats} seat{p.seats > 1 ? "s" : ""} · {candidates.filter((c) => c.positionId === p.id).length} candidates</span>
              </div>
            ))}
          </div>
        </div>

        {/* Candidates */}
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Candidates ({candidates.length})</h3>
          {candidates.length === 0 ? (
            <p className="text-sm text-[var(--sevs-text-muted)]">No candidates registered.</p>
          ) : (
            <div className="space-y-2">
              {candidates.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--sevs-text-body)]">{c.name}</span>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approval / DAT status */}
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Approval Status</h3>
          {approvals.length === 0 ? (
            <p className="text-sm text-[var(--sevs-text-muted)]">No approval requests recorded for this election.</p>
          ) : (
            <div className="space-y-3">
              {approvals.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--sevs-text-body)]">{formatApprovalType(a.type)}</span>
                  <DatBadge approval={a} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activation / closure actions */}
        {!isReadOnly && member.role === "ELECTION_OFFICER" && (
          <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Actions</h3>
            {pendingApproval ? (
              <p className="text-sm font-semibold text-amber-600">A {formatApprovalType(pendingApproval.type).toLowerCase()} request is awaiting co-approval.</p>
            ) : election.approvalStatus === "DRAFT" ? (
              <button
                onClick={() => setConfirming("ELECTION_ACTIVATION")}
                className="rounded-lg bg-[var(--sevs-navy)] px-4 py-2.5 text-sm font-bold text-white"
              >
                Submit for Approval
              </button>
            ) : lifecycle === "ACTIVE" ? (
              <button
                onClick={() => setConfirming("ELECTION_CLOSURE")}
                className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600"
              >
                Request Early Closure
              </button>
            ) : (
              <p className="text-sm text-[var(--sevs-text-muted)]">No actions available for the current status.</p>
            )}
          </div>
        )}

        {/* Audit/activity */}
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
            Activity ({getAuditEventCountForElection(election.id)})
          </h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-[var(--sevs-text-muted)]">No recorded activity.</p>
          ) : (
            <ol className="space-y-3 border-l-2 border-[var(--sevs-border)] pl-4">
              {timeline.map((log) => (
                <li key={log.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[var(--sevs-navy)]" />
                  <p className="text-sm font-medium text-[var(--sevs-navy)]">{log.action}</p>
                  <p className="text-xs text-[var(--sevs-text-muted)]">
                    {log.actor} · {new Date(log.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {confirming && (
        <ConfirmDialog
          title={confirming === "ELECTION_ACTIVATION" ? "Submit for approval?" : "Request early closure?"}
          message={
            confirming === "ELECTION_ACTIVATION"
              ? "This submits the election for Distributed Administration Trust approval. It becomes SCHEDULED only once both required approvals are recorded on the Approvals page."
              : "This creates a Distributed Administration Trust request. The election only closes once both required approvals are recorded on the Approvals page."
          }
          confirmLabel="Submit Request"
          onConfirm={handleConfirm}
          onCancel={() => setConfirming(null)}
        />
      )}
    </>
  );
}