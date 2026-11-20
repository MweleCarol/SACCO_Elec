"use client";

import clsx from "clsx";
import { CheckCircle2 } from "lucide-react";
import type { BallotPosition } from "@/types/api";
import { CandidateAvatar } from "@/components/voter/CandidateAvatar";

interface Props {
  position: BallotPosition;
  selectedId: string | undefined;
  onSelect: (candidateId: string) => void;
}

// One position on the ballot, as a real radio group: arrow keys move between
// candidates, and screen readers announce "Chairperson, radio group, 1 of 2,
// selected". The manifesto sits below each card so opening it never changes
// the selection by accident.
export function BallotPositionGroup({ position, selectedId, onSelect }: Props) {
  return (
    <fieldset id={`position-${position.id}`} className="scroll-mt-24">
      <legend className="mb-1 text-base font-bold text-[var(--sevs-navy)]">{position.name}</legend>
      <p className="mb-3 text-xs text-[var(--sevs-text-muted)]">
        Choose 1 candidate{position.description ? ` · ${position.description}` : ""}
      </p>

      {position.candidates.length === 0 ? (
        <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-[var(--sevs-text-muted)]">
          No approved candidates for this position.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {position.candidates.map((candidate) => {
            const checked = selectedId === candidate.id;
            const inputId = `cand-${candidate.id}`;
            return (
              <div
                key={candidate.id}
                className={clsx(
                  "rounded-xl border-2 bg-white transition",
                  checked ? "border-[var(--sevs-navy)] bg-[var(--sevs-navy)]/[0.03]" : "border-[var(--sevs-border)] hover:border-gray-300"
                )}
              >
                <label htmlFor={inputId} className="flex cursor-pointer items-center gap-3 p-4">
                  <input
                    id={inputId}
                    type="radio"
                    name={`position-${position.id}`}
                    value={candidate.id}
                    checked={checked}
                    onChange={() => onSelect(candidate.id)}
                    className="peer sr-only"
                  />
                  <CandidateAvatar name={candidate.displayName} photoUrl={candidate.photoUrl} />
                  <span className="min-w-0 flex-1 font-semibold text-[var(--sevs-navy)]">{candidate.displayName}</span>
                  {/* Visible radio indicator; the focus ring shows where the keyboard is. */}
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--sevs-navy)]/40 peer-focus-visible:ring-offset-2",
                      checked ? "border-[var(--sevs-navy)] bg-[var(--sevs-navy)] text-white" : "border-gray-300"
                    )}
                  >
                    {checked && <CheckCircle2 className="h-4 w-4" />}
                  </span>
                </label>
                {candidate.manifesto && (
                  <details className="border-t border-[var(--sevs-border)] px-4 py-2 text-sm">
                    <summary className="cursor-pointer select-none text-xs font-bold text-[var(--sevs-navy)]">
                      Read manifesto<span className="sr-only"> of {candidate.displayName}</span>
                    </summary>
                    <p className="mt-2 whitespace-pre-line text-[var(--sevs-text-body)]">{candidate.manifesto}</p>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}