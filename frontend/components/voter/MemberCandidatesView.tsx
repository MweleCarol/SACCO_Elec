"use client";

import { useState } from "react";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { useElectionList } from "@/hooks/useElections";
import { useCandidates, usePositions } from "@/hooks/useCandidacy";
import {
  memberPhase,
  nominationsOpen,
  PHASE_DISPLAY,
} from "@/lib/electionStatus";
import { getApiErrorMessage } from "@/services/api/errors";
import { Topbar } from "@/components/layout/Topbar";
import { CandidateAvatar } from "@/components/voter/CandidateAvatar";
import {
  EmptyState,
  ErrorPanel,
  LoadingCards,
} from "@/components/ui/LoadState";

// Approved candidates in elections that are coming up or open, grouped by
// position, with each manifesto, so members can make up their minds early.
export function MemberCandidatesView() {
  const elections = useElectionList();
  const relevant = (elections.data ?? [])
    .filter((e) => ["OPEN", "UPCOMING"].includes(memberPhase(e)))
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
  const [chosenId, setChosenId] = useState<string | null>(null);
  // Default: an election open for voting, otherwise the next one coming up.
  const selected =
    relevant.find((e) => e.id === chosenId) ??
    relevant.find((e) => memberPhase(e) === "OPEN") ??
    relevant[0];

  const positions = usePositions(selected?.id ?? "", !!selected);
  const candidates = useCandidates(selected?.id ?? "", !!selected);

  return (
    <>
      <Topbar
        title="Candidates"
        subtitle="Who is standing, and what they promise"
      />
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
        {elections.isLoading && (
          <LoadingCards count={2} label="Loading candidates…" />
        )}
        {elections.isError && (
          <ErrorPanel
            message={getApiErrorMessage(elections.error)}
            onRetry={() => elections.refetch()}
          />
        )}
        {elections.isSuccess && relevant.length === 0 && (
          <EmptyState title="No upcoming or open elections">
            Candidates appear here once an election is announced.{" "}
            <Link
              href="/results"
              className="font-bold text-[var(--sevs-navy)] hover:underline"
            >
              See past results
            </Link>
          </EmptyState>
        )}

        {selected && (
          <>
            {relevant.length > 1 && (
              <div>
                <label
                  htmlFor="election-select"
                  className="mb-1 block text-sm font-bold text-[var(--sevs-navy)]"
                >
                  Election
                </label>
                <select
                  id="election-select"
                  value={selected.id}
                  onChange={(ev) => setChosenId(ev.target.value)}
                  className="w-full rounded-lg border border-[var(--sevs-border)] bg-white px-3 py-2.5 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20 sm:w-auto sm:min-w-80"
                >
                  {relevant.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({PHASE_DISPLAY[memberPhase(e)].label})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {nominationsOpen(selected) && (
              <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-2 text-sm text-blue-900">
                  <Megaphone
                    className="mt-0.5 h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  Nominations for {selected.name} are open until voting starts.
                  Any member with an active membership can stand.
                </p>
                <Link
                  href={`/candidates/apply/${selected.id}`}
                  className="shrink-0 rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-center text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
                >
                  Stand as a candidate
                </Link>
              </div>
            )}

            {(positions.isLoading || candidates.isLoading) && (
              <LoadingCards count={2} label="Loading candidates…" />
            )}
            {(positions.isError || candidates.isError) && (
              <ErrorPanel
                message={getApiErrorMessage(
                  positions.error ?? candidates.error,
                )}
              />
            )}

            {positions.data?.map((p) => {
              const list = (candidates.data ?? []).filter(
                (c) => c.positionId === p.id,
              );
              return (
                <section key={p.id} aria-labelledby={`cands-${p.id}`}>
                  <h2
                    id={`cands-${p.id}`}
                    className="mb-3 text-lg font-bold text-[var(--sevs-navy)]"
                  >
                    {p.name}{" "}
                    <span className="text-sm font-medium text-[var(--sevs-text-muted)]">
                      ({list.length} candidate{list.length === 1 ? "" : "s"})
                    </span>
                  </h2>
                  {list.length === 0 ? (
                    <p className="rounded-xl bg-white px-4 py-3 text-sm text-[var(--sevs-text-muted)] ring-1 ring-[var(--sevs-border)]">
                      No approved candidates yet.
                    </p>
                  ) : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {list.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-xl border border-[var(--sevs-border)] bg-white p-4"
                        >
                          <div className="flex items-center gap-3">
                            <CandidateAvatar
                              name={c.displayName}
                              photoUrl={c.photoUrl}
                              size="lg"
                            />
                            <p className="font-bold text-[var(--sevs-navy)]">
                              {c.displayName}
                            </p>
                          </div>
                          {c.manifesto ? (
                            <details className="mt-3 text-sm">
                              <summary className="cursor-pointer select-none font-bold text-[var(--sevs-navy)]">
                                Read manifesto
                                <span className="sr-only">
                                  {" "}
                                  of {c.displayName}
                                </span>
                              </summary>
                              <p className="mt-2 whitespace-pre-line text-[var(--sevs-text-body)]">
                                {c.manifesto}
                              </p>
                            </details>
                          ) : (
                            <p className="mt-3 text-sm text-[var(--sevs-text-muted)]">
                              No manifesto provided.
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
