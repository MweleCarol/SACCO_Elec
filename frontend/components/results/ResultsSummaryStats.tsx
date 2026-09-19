import { Users2, Vote, CheckSquare, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";

interface ResultsSummaryStatsProps {
  eligibleVoters: number;
  totalVotesCast: number;
  turnoutPct: number;
  validVotes: number;
  invalidVotes: number;
}

export function ResultsSummaryStats({ eligibleVoters, totalVotesCast, turnoutPct, validVotes, invalidVotes }: ResultsSummaryStatsProps) {
  const invalidPct = totalVotesCast > 0 ? Math.round((invalidVotes / totalVotesCast) * 1000) / 10 : 0;
  const validPct = totalVotesCast > 0 ? Math.round((validVotes / totalVotesCast) * 1000) / 10 : 0;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard
        label="Eligible Voters"
        value={eligibleVoters.toLocaleString()}
        hint="Total members in the election"
        icon={<Users2 className="h-4 w-4" />}
        iconTone="navy"
      />
      <StatCard
        label="Total Votes Cast"
        value={totalVotesCast.toLocaleString()}
        hint={`${turnoutPct}% turnout`}
        icon={<Vote className="h-4 w-4" />}
        iconTone="navy"
      />
      <StatCard
        label="Valid Votes"
        value={validVotes.toLocaleString()}
        hint={`${validPct}% of total votes`}
        icon={<CheckSquare className="h-4 w-4" />}
        iconTone="green"
      />
      <StatCard
        label="Invalid Votes"
        value={invalidVotes.toLocaleString()}
        hint={`${invalidPct}% of total votes`}
        icon={<AlertTriangle className="h-4 w-4" />}
        iconTone="red"
      />
    </div>
  );
}