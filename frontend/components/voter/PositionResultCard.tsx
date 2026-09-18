"use client";

import { useState } from "react";
import Image from "next/image";
import { Crown } from "lucide-react";
import type { PositionResult } from "@/types/result";
import { mockCandidates } from "@/services/mock/candidates";

interface PositionResultCardProps {
  result: PositionResult;
  accentColor: string;
  accentBg: string;
  icon: React.ReactNode;
}

function CandidateAvatar({
  name,
  photoUrl,
}: {
  name: string;
  photoUrl?: string;
}) {
  const [failed, setFailed] = useState(!photoUrl);
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  if (failed) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sevs-navy)]/10 text-xs font-bold text-[var(--sevs-navy)]">
        {initials}
      </div>
    );
  }
  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100">
      <Image
        src={photoUrl!}
        alt={name}
        fill
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function PositionResultCard({
  result,
  accentColor,
  accentBg,
  icon,
}: PositionResultCardProps) {
  const sorted = [...result.candidates].sort((a, b) => b.votes - a.votes);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--sevs-border)] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--sevs-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: accentColor }}
          >
            {icon}
          </span>
          <h3 className="text-sm font-bold text-[var(--sevs-navy)]">
            {result.positionTitle}
          </h3>
        </div>
        <span className="text-xs font-medium text-[var(--sevs-text-muted)]">
          {result.candidates.length} candidate
          {result.candidates.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="divide-y divide-[var(--sevs-border)]">
        {sorted.map((candidate, i) => {
          const pct =
            result.totalVotesCast > 0
              ? Math.round((candidate.votes / result.totalVotesCast) * 100)
              : 0;
          const photoUrl =
            candidate.photoUrl ??
            mockCandidates.find((c) => c.id === candidate.candidateId)
              ?.photoUrl;

          return (
            <div
              key={candidate.candidateId}
              className="flex items-start gap-3 px-4 py-3"
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${accentBg}`}
                style={{ color: accentColor }}
              >
                {i + 1}
              </span>
              <CandidateAvatar
                name={candidate.candidateName}
                photoUrl={photoUrl}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-[var(--sevs-navy)]">
                    {candidate.candidateName}
                  </p>
                  {candidate.isWinner && (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      <Crown className="h-3 w-3" /> Winner
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs text-[var(--sevs-text-muted)]">
                  <span>{candidate.votes.toLocaleString()} votes</span>
                  <span className="font-semibold text-[var(--sevs-navy)]">
                    {pct}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: accentColor }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
