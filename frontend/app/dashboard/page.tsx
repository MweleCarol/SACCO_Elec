"use client";

import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { VoterDashboard } from "@/components/voter/VoterDashboard";
import { ElectionOfficerDashboard } from "@/components/admin/ElectionOfficerDashboard";
import { ElectionAdministratorDashboard } from "@/components/admin/ElectionAdministratorDashboard";
import { AuditorDashboard } from "@/components/admin/AuditorDashboard";

const SUBTITLES: Record<string, (firstName: string) => string> = {
  MEMBER: (firstName) => `Welcome back, ${firstName}`,
  ELECTION_OFFICER: () => "Manage elections, candidates and approvals",
  ADMINISTRATOR: () => "System administration and election oversight",
  AUDITOR: () => "Election oversight, audit activity and governance monitoring",
};

export default function DashboardPage() {
  const { member, isLoading } = useCurrentMember();

  if (isLoading) {
    return null;
  }

  if (!member) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">
          You&apos;re not signed in.{" "}
          <a href="/login" className="font-bold text-[var(--sevs-navy)] hover:underline">
            Log in
          </a>{" "}
          to view your dashboard.
        </p>
      </div>
    );
  }

  const subtitle = SUBTITLES[member.role](member.name.split(" ")[0]);

  return (
    <>
      <Topbar title="Dashboard" subtitle={subtitle} notificationCount={3} />
      {member.role === "MEMBER" && <VoterDashboard user={member} />}
      {member.role === "ELECTION_OFFICER" && <ElectionOfficerDashboard user={member} />}
      {member.role === "ADMINISTRATOR" && <ElectionAdministratorDashboard user={member} />}
      {member.role === "AUDITOR" && <AuditorDashboard user={member} />}
    </>
  );
}