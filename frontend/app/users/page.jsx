"use client";

import { Topbar } from "@/components/layout/Topbar";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { useCurrentMember } from "@/hooks/useCurrentMember";

export default function UsersPage() {
  const { member, isLoading } = useCurrentMember();
  if (isLoading) return null;

  if (!member || (member.role !== "ADMINISTRATOR" && member.role !== "ELECTION_OFFICER")) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  return (
    <>
      <Topbar title="User Management" subtitle="Manage member and staff accounts" />
      <div className="p-4 sm:p-8">
        <UserManagementTable />
      </div>
    </>
  );
}