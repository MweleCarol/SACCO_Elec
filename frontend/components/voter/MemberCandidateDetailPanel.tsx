"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Briefcase, Hash, Mail, MapPin, Download, CheckCircle2, Circle } from "lucide-react";
import type { Candidate } from "@/types/candidate";
import { mockElections } from "@/services/mock/elections";
import { getMemberById } from "@/services/mock/members";
import { getOrCreateReview } from "@/services/mock/candidate-review";

interface MemberCandidateDetailPanelProps {
  candidate: Candidate;
  onClose: () => void;
}

type PanelTab = "OVERVIEW" | "DOCUMENTS";

const KEY_REQUIREMENTS: { key: string; label: string }[] = [
  { key: "identity", label: "Valid ID / National ID" },
  { key: "membership_number", label: "Membership number provided" },
  { key: "qualifications", label: "Academic & professional certificates" },
  { key: "nomination_validity", label: "Completed nomination form" },
];

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 py-2 text-sm">
      <span className="mt-0.5 shrink-0 text-[var(--sevs-text-muted)]">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-[var(--sevs-text-muted)]">{label}</p>
        <p className="break-words font-medium text-[var(--sevs-navy)]">{value}</p>
      </div>
    </div>
  );
}

export function MemberCandidateDetailPanel({ candidate, onClose }: MemberCandidateDetailPanelProps) {
  const [tab, setTab] = useState<PanelTab>("OVERVIEW");
  const [imgFailed, setImgFailed] = useState(false);

  const election = mockElections.find((e) => e.id === candidate.electionId);
  const position = election?.positions.find((p) => p.id === candidate.positionId);
  const applicant = getMemberById(candidate.applicantMemberId);
  const review = getOrCreateReview(candidate.id);
  const initials = candidate.name.split(" ").map((p) => p[0]).slice(0, 2).join("");

  let documentsBody: React.ReactNode;
  if (candidate.documentUrl) {
    documentsBody = (
      
        href={candidate.documentUrl}
        className="flex items-center gap-2 rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm font-semibold text-[var(--sevs-navy)] hover:bg-[var(--sevs-bg)]"
      >
        <Download className="h-4 w-4" />
        View Manifesto (PDF)
      </a>
    );
  } else {
    documentsBody = (
      <p className="text-sm text-[var(--sevs-text-muted)]">No documents have been shared by this candidate.</p>
    );
  }

  const overviewBody = (
    <>
      <div className="divide-y divide-[var(--sevs-border)]">
        <DetailRow icon={<Briefcase className="h-4 w-4" />} label="Position" value={position?.title ?? "—"} />
        <DetailRow icon={<Hash className="h-4 w-4" />} label="Candidate ID" value={candidate.id} />
        {applicant?.email && <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={applicant.email} />}
        {applicant?.branch && <DetailRow icon={<MapPin className="h-4 w-4" />} label="Branch" value={applicant.branch} />}
      </div>

      <div>
        <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">About</h4>
        <p className="break-words text-sm text-[var(--sevs-text-body)]">{candidate.bio}</p>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Key Requirements</h4>
        <ul className="space-y-1.5">
          {KEY_REQUIREMENTS.map((r) => {
            const passed = review.verdicts[r.key] === "PASS";
            const icon = passed
              ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
              : <Circle className="h-4 w-4 shrink-0 text-gray-300" />;
            return (
              <li key={r.key} className="flex items-center gap-2 text-sm">
                {icon}
                <span className={passed ? "text-[var(--sevs-text-body)]" : "text-[var(--sevs-text-muted)]"}>{r.label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {candidate.status === "APPROVED" && (
        <p className="rounded-lg bg-green-50 px-3 py-2.5 text-xs text-green-800">
          This candidate has been approved and is eligible to participate in the election.
        </p>
      )}
    </>
  );

  const content = (
    <>
      <div className="flex items-center justify-between border-b border-[var(--sevs-border)] px-5 py-4">
        <h3 className="text-sm font-bold text-[var(--sevs-navy)]">Candidate Details</h3>
        <button onClick={onClose} aria-label="Close">
          <X className="h-5 w-5 text-[var(--sevs-text-muted)]" />
        </button>
      </div>

      <div className="border-b border-[var(--sevs-border)] px-5 py-4">
        <div className="flex items-center gap-3">
          {imgFailed ? (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--sevs-navy)]/10 text-sm font-bold text-[var(--sevs-navy)]">
              {initials}
            </div>
          ) : (
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-100">
              <Image src={candidate.photoUrl} alt={candidate.name} fill className="object-cover" onError={() => setImgFailed(true)} />
            </div>
          )}
          <div className="min-w-0">
            <p className="break-words font-bold text-[var(--sevs-navy)]">{candidate.name}</p>
            <p className="text-sm text-[var(--sevs-text-muted)]">{position?.title ?? "—"}</p>
          </div>
        </div>

        <div className="mt-3 flex gap-4 border-b border-[var(--sevs-border)]">
          <button
            onClick={() => setTab("OVERVIEW")}
            className={`border-b-2 pb-2 text-sm font-bold transition ${
              tab === "OVERVIEW" ? "border-[var(--sevs-navy)] text-[var(--sevs-navy)]" : "border-transparent text-[var(--sevs-text-muted)]"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab("DOCUMENTS")}
            className={`border-b-2 pb-2 text-sm font-bold transition ${
              tab === "DOCUMENTS" ? "border-[var(--sevs-navy)] text-[var(--sevs-navy)]" : "border-transparent text-[var(--sevs-text-muted)]"
            }`}
          >
            Documents ({candidate.documentUrl ? 1 : 0})
          </button>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        {tab === "OVERVIEW" ? overviewBody : documentsBody}
      </div>
    </>
  );

  return (
    <>
      <div className="hidden w-96 shrink-0 rounded-2xl border border-[var(--sevs-border)] bg-white shadow-sm lg:block">
        {content}
      </div>
      <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-lg lg:hidden">
        {content}
      </div>
    </>
  );
}