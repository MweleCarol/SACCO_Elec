"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import * as electionsService from "@/services/elections.service";
import { useElection, useParticipation } from "@/hooks/useElections";
import {
  formatDateTime,
  memberPhase,
  nominationsOpen,
  timeUntil,
} from "@/lib/electionStatus";
import { getApiErrorMessage } from "@/services/api/errors";
import { Topbar } from "@/components/layout/Topbar";
import { ElectionStatusBadge } from "@/components/voter/ElectionStatusBadge";
import { CandidateAvatar } from "@/components/voter/CandidateAvatar";
import { ErrorPanel, LoadingCards } from "@/components/ui/LoadState";

// Read-only view of one election for members: dates, positions and the
// approved candidates with their manifestos, so members can decide before
// voting opens.
export function MemberElectionDetail({ id }: { id: string }) {
  const election = useElection(id);
  const positions = useQuery({
    queryKey: ["positions", id],
    queryFn: () => electionsService.listPositions(id),
  });
  const candidates = useQuery({
    queryKey: ["candidates", id],
    queryFn: () => electionsService.listCandidates(id),
  });
  const phase = election.data ? memberPhase(election.data) : undefined;
  const participation = useParticipation(id, phase === "OPEN");

  if (election.isLoading || positions.isLoading || candidates.isLoading) {
    return (
      <>
        <Topbar title="Election" subtitle="Loading…" />
        <div className="p-4 sm:p-8">
          <LoadingCards count={2} />
        </div>
      </>
    );
  }

  const error = election.error ?? positions.error ?? candidates.error;
  if (error || !election.data) {
    return (
      <>
        <Topbar title="Election" subtitle="" />
        <div className="p-4 sm:p-8">
          <ErrorPanel
            message={getApiErrorMessage(
              error,
              "This election could not be found.",
            )}
            backHref="/elections"
          />
        </div>
      </>
    );
  }

  const e = election.data;
  const byPosition = (positionId: string) =>
    (candidates.data ?? []).filter((c) => c.positionId === positionId);
  const canVote = phase === "OPEN" && participation.data?.hasVoted === false;

  return (
    <>
      <Topbar title={e.name} subtitle="Election details" />
      <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
        <section className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {e.description && (
                <p className="text-sm text-[var(--sevs-text-body)]">
                  {e.description}
                </p>
              )}
              <dl className="mt-3 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="inline text-[var(--sevs-text-muted)]">
                    Voting opens:{" "}
                  </dt>
                  <dd className="inline font-medium">
                    {formatDateTime(e.startDate)}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-[var(--sevs-text-muted)]">
                    Voting closes:{" "}
                  </dt>
                  <dd className="inline font-medium">
                    {formatDateTime(e.endDate)}
                  </dd>
                </div>
              </dl>
            </div>
            <ElectionStatusBadge election={e} />
          </div>

          {phase === "CANCELLED" && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-900">
              <span className="font-bold">This election was cancelled.</span>
              {e.cancellationReason && <> Reason: {e.cancellationReason}</>}
            </p>
          )}
          {phase === "OPEN" && participation.data?.hasVoted && (
            <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
              You have voted in this election.
            </p>
          )}
          {phase === "UPCOMING" && (
            <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
              Voting opens {timeUntil(e.startDate)}.
            </p>
          )}
          {nominationsOpen(e) && (
            <Link
              href={`/candidates/apply/${e.id}`}
              className="mt-4 mr-3 inline-block rounded-lg border border-[var(--sevs-border)] px-5 py-2.5 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
            >
              Stand as a candidate
            </Link>
          )}
          {(canVote || phase === "RESULTS") && (
            <Link
              href={canVote ? `/vote/${e.id}` : `/results/${e.id}`}
              className="mt-4 inline-block rounded-lg bg-[var(--sevs-navy)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
            >
              {canVote ? "Vote now" : "View results"}
            </Link>
          )}
        </section>

        {(positions.data ?? []).map((p) => (
          <section key={p.id} aria-labelledby={`pos-${p.id}`}>
            <h2
              id={`pos-${p.id}`}
              className="mb-3 text-lg font-bold text-[var(--sevs-navy)]"
            >
              {p.name}
            </h2>
            {byPosition(p.id).length === 0 ? (
              <p className="text-sm text-[var(--sevs-text-muted)]">
                No approved candidates yet.
              </p>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {byPosition(p.id).map((c) => (
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
                    <p className="mt-3 whitespace-pre-line text-sm text-[var(--sevs-text-body)]">
                      {c.manifesto ?? (
                        <span className="text-[var(--sevs-text-muted)]">
                          No manifesto provided.
                        </span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
