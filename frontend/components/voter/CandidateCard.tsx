import Image from "next/image";
import type { Candidate } from "@/types/candidate";

interface CandidateCardProps {
  candidate: Candidate;
}

export function CandidateCard({ candidate }: CandidateCardProps) {
  return (
    <div className="flex gap-4 rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100">
        <Image src={candidate.photoUrl} alt={candidate.name} fill className="object-cover" />
      </div>
      <div className="min-w-0">
        <h4 className="font-bold text-[var(--sevs-navy)]">{candidate.name}</h4>
        <p className="text-xs text-[var(--sevs-text-muted)]">
          Membership No. {candidate.membershipNumber}
        </p>
        <p className="mt-2 line-clamp-3 text-sm text-[var(--sevs-text-body)]">{candidate.bio}</p>
      </div>
    </div>
  );
}