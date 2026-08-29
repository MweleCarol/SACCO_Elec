import type { Member } from "@/types/member";
import { StatCard } from "@/components/dashboard/StatCard";
import { VoterElectionCard } from "@/components/voter/VoterElectionCard";
import { getActiveElections } from "@/services/mock/elections";
import { getCandidatesByElection } from "@/services/mock/candidates";
import { CheckSquare, Vote, Users2, Clock } from "lucide-react";

interface VoterDashboardProps {
  user: Member;
}

// VoterDashboard component that displays the dashboard for voters, including statistics and a list of active elections.
export function VoterDashboard({ user }: VoterDashboardProps) {
  const activeElections = getActiveElections();

  const totalPositions = activeElections.reduce((sum, e) => sum + e.positions.length, 0);
  const totalCandidates = activeElections.reduce(
    (sum, e) => sum + getCandidatesByElection(e.id).filter((c) => c.status === "APPROVED").length,
    0
  );

  // Calculate the nearest closing date among active elections and the number of days left until that date.
  const nearestClose = activeElections
    .map((e) => new Date(e.endDate))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const daysLeft = nearestClose
    ? Math.max(0, Math.ceil((nearestClose.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="space-y-8 p-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Elections" value={activeElections.length} hint="Open for voting" icon={<Vote className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="Open Positions" value={totalPositions} hint="Across all active elections" icon={<CheckSquare className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="Approved Candidates" value={totalCandidates} hint="Ready to review" icon={<Users2 className="h-4 w-4 text-[var(--sevs-navy)]" />} />
        <StatCard label="Closing Soon" value={daysLeft !== null ? `${daysLeft}d` : "—"} hint="Until nearest election closes" icon={<Clock className="h-4 w-4 text-[var(--sevs-navy)]" />} />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold text-[var(--sevs-navy)]">Elections open to you</h2>
        <div className="space-y-4">
          {activeElections.length === 0 && (
            <p className="text-sm text-[var(--sevs-text-muted)]">No active elections at the moment.</p>
          )}
          {activeElections.map((election) => (
            <VoterElectionCard key={election.id} election={election} />
          ))}
        </div>
      </div>
    </div>
  );
}