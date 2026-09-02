"use client";

import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DatBadge } from "@/components/officer/DatBadge";
import { getApplicationsByMember, getCandidateDisplayStatus } from "@/services/mock/candidates";
import { getApprovalsForTarget } from "@/services/mock/approvals";
import { getOrCreateReview, isReviewComplete } from "@/services/mock/candidate-review";
import { mockElections } from "@/services/mock/elections";

export default function MyCandidacyPage() {
  const { member, isLoading } = useCurrentMember();

  if (isLoading) return null;
  if (!member) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">
          You&apos;re not signed in.{" "}
          <a href="/login" className="font-bold text-[var(--sevs-navy)] hover:underline">Log in</a> to view your applications.
        </p>
      </div>
    );
  }

  const applications = getApplicationsByMember(member.id);

  return (
    <>
      <Topbar title="My Candidacy" subtitle="Track your candidate applications" />

      <div className="space-y-4 p-4 sm:p-8">
        {applications.length === 0 && (
          <p className="text-sm text-[var(--sevs-text-muted)]">
            You haven&apos;t applied to be a candidate in any election yet.
          </p>
        )}

        {applications.map((candidate) => {
          const election = mockElections.find((e) => e.id === candidate.electionId);
          const position = election?.positions.find((p) => p.id === candidate.positionId);
          const approval = getApprovalsForTarget(candidate.id).find((a) => a.status === "PENDING" || a.status === "APPROVED");
          const displayStatus = getCandidateDisplayStatus(candidate.id, Boolean(approval && approval.status === "PENDING"));
          const verified = isReviewComplete(candidate.id);
          const review = getOrCreateReview(candidate.id);

          let nextStep = "Awaiting Election Officer review.";
          if (displayStatus === "Awaiting Approval") nextStep = "Awaiting Administrator co-approval.";
          if (displayStatus === "Approved") nextStep = "You are confirmed on the ballot for this position.";
          if (displayStatus === "Rejected" && review.rejectionReason) nextStep = review.rejectionReason;

          return (
            <div key={candidate.id} className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[var(--sevs-navy)]">{position?.title ?? "—"}</p>
                  <p className="text-xs text-[var(--sevs-text-muted)]">{election?.title ?? "—"}</p>
                </div>
                <StatusBadge status={displayStatus} />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="flex items-center justify-between sm:block">
                  <span className="text-xs uppercase text-[var(--sevs-text-muted)]">Verification</span>
                  <span className={`ml-2 font-medium sm:ml-0 sm:mt-1 sm:block ${verified ? "text-green-600" : "text-[var(--sevs-text-muted)]"}`}>
                    {verified ? "Completed" : "In progress"}
                  </span>
                </div>
                {approval && (
                  <div className="flex items-center justify-between sm:block">
                    <span className="text-xs uppercase text-[var(--sevs-text-muted)]">DAT</span>
                    <span className="ml-2 sm:ml-0 sm:mt-1 sm:block"><DatBadge approval={approval} /></span>
                  </div>
                )}
              </div>

              <p className="mt-4 rounded-lg bg-[var(--sevs-bg)] px-3 py-2 text-xs text-[var(--sevs-text-body)]">
                <span className="font-bold">Next step: </span>{nextStep}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}