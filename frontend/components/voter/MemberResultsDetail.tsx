"use client";

import Link from "next/link";
import { Award, Printer } from "lucide-react";
import type { Result } from "@/types/api";
import { useElection } from "@/hooks/useElections";
import { usePositions } from "@/hooks/useCandidacy";
import { useResults, useTurnout } from "@/hooks/useResults";
import { formatDateTime } from "@/lib/electionStatus";
import { getApiErrorMessage, getApiStatus } from "@/services/api/errors";
import { Topbar } from "@/components/layout/Topbar";
import { CandidateAvatar } from "@/components/voter/CandidateAvatar";
import { ErrorPanel, LoadingCards } from "@/components/ui/LoadState";

const votes = (n: number) => `${n.toLocaleString("en-KE")} vote${n === 1 ? "" : "s"}`;
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

// The official results of one election, for members. Shown only after
// publication. Each position lists every candidate with votes and share; the
// winner is marked with a word and an icon, not by colour alone.
export function MemberResultsDetail({ electionId }: { electionId: string }) {
  const election = useElection(electionId);
  const positions = usePositions(electionId);
  const results = useResults(electionId);
  const turnout = useTurnout(electionId, results.isSuccess);

  if (election.isLoading || results.isLoading || positions.isLoading) {
    return (
      <>
        <Topbar title="Results" subtitle="Loading…" />
        <div className="p-4 sm:p-8"><LoadingCards count={2} label="Loading results…" /></div>
      </>
    );
  }

  const notPublished = getApiStatus(results.error) === 403;
  const error = election.error ?? results.error;
  if (error || !election.data || !results.data) {
    return (
      <>
        <Topbar title="Results" subtitle="" />
        <div className="mx-auto max-w-4xl p-4 sm:p-8">
          <ErrorPanel
            message={
              notPublished
                ? "Results for this election have not been published yet. You'll get a notification when they are."
                : getApiErrorMessage(error, "These results could not be found.")
            }
            backHref="/results"
            backLabel="Back to results"
          />
        </div>
      </>
    );
  }

  const e = election.data;
  // Positions in ballot order; any result whose position is missing goes last.
  const order = new Map((positions.data ?? []).map((p) => [p.id, p.order]));
  const groups = new Map<string, { name: string; rows: Result[] }>();
  for (const r of results.data) {
    const g = groups.get(r.positionId) ?? { name: r.positionName, rows: [] };
    g.rows.push(r);
    groups.set(r.positionId, g);
  }
  const sortedGroups = [...groups.entries()].sort(
    ([a], [b]) => (order.get(a) ?? Number.MAX_SAFE_INTEGER) - (order.get(b) ?? Number.MAX_SAFE_INTEGER)
  );
  const t = turnout.data;

  return (
    <>
      <Topbar title="Results" subtitle={e.name} />
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
        <section className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words text-xl font-bold text-[var(--sevs-navy)]">{e.name}</h2>
              <p className="mt-1 text-sm text-[var(--sevs-text-muted)]">
                Official results · published {e.resultsPublishedAt ? formatDateTime(e.resultsPublishedAt) : ""}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50 print:hidden"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print or save as PDF
            </button>
          </div>

          {t && (
            <div className="mt-5">
              <p className="text-sm text-[var(--sevs-text-body)]">
                <span className="text-2xl font-extrabold text-[var(--sevs-navy)]">{t.votesCast.toLocaleString("en-KE")}</span>{" "}
                {t.eligibleVoters !== null ? (
                  <>
                    of {t.eligibleVoters.toLocaleString("en-KE")} eligible members voted
                    {t.turnoutPercent !== null && <> · <strong>{t.turnoutPercent}% turnout</strong></>}
                  </>
                ) : (
                  "members voted"
                )}
              </p>
              {t.turnoutPercent !== null && (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                  <div className="h-full rounded-full bg-[var(--sevs-navy)]" style={{ width: `${Math.min(t.turnoutPercent, 100)}%` }} />
                </div>
              )}
            </div>
          )}
        </section>

        {sortedGroups.length === 0 && (
          <p className="text-sm text-[var(--sevs-text-muted)]">No results were recorded for this election.</p>
        )}

        {sortedGroups.map(([positionId, { name, rows }]) => {
          const total = rows.reduce((sum, r) => sum + r.voteCount, 0);
          const ranked = [...rows].sort((a, b) => b.voteCount - a.voteCount || Number(b.isWinner) - Number(a.isWinner));
          return (
            <section key={positionId} aria-labelledby={`res-${positionId}`} className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h3 id={`res-${positionId}`} className="text-lg font-bold text-[var(--sevs-navy)]">{name}</h3>
                <p className="text-sm text-[var(--sevs-text-muted)]">{votes(total)} in total</p>
              </div>
              <ol className="space-y-4">
                {ranked.map((r) => {
                  const share = pct(r.voteCount, total);
                  return (
                    <li key={r.id}>
                      <div className="flex items-center gap-3">
                        <CandidateAvatar name={r.candidateName} photoUrl={null} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                            <p className="flex flex-wrap items-center gap-2 font-semibold text-[var(--sevs-navy)]">
                              {r.candidateName}
                              {r.isWinner && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-800 ring-1 ring-inset ring-green-600/20">
                                  <Award className="h-3.5 w-3.5" aria-hidden="true" />
                                  Elected
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-[var(--sevs-text-body)]">
                              <strong>{votes(r.voteCount)}</strong> · {share}%
                            </p>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                            <div
                              className={`h-full rounded-full ${r.isWinner ? "bg-green-600" : "bg-gray-400"}`}
                              style={{ width: `${share}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}

        <p className="text-xs text-[var(--sevs-text-muted)] print:hidden">
          Results were approved by more than one SACCO official before publication, and every step is recorded in a
          tamper-evident audit log. <Link href="/results" className="font-bold text-[var(--sevs-navy)] hover:underline">All results</Link>
        </p>
      </div>
    </>
  );
}