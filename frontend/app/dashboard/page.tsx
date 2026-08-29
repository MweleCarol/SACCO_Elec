"use client";

import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { VoterDashboard } from "@/components/voter/VoterDashboard";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

// DashboardPage component that renders the appropriate dashboard based on the user's role (admin or voter).
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

  const isAdminRole =
    member.role === "ELECTION_OFFICER" || member.role === "ADMINISTRATOR" || member.role === "AUDITOR";

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle={isAdminRole ? "Election administration overview" : `Welcome back, ${member.name.split(" ")[0]}`}
        notificationCount={3}
      />
      {isAdminRole ? <AdminDashboard user={member} /> : <VoterDashboard user={member} />}
    </>
  );
}