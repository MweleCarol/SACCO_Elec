"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { VoterSidebar } from "@/components/layout/VoterSidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password"];

// AppShell component that wraps the application layout, rendering either the VoterSidebar or AdminSidebar based on the current member's role.
// It also handles public paths and loading states.
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { member, isLoading } = useCurrentMember();

  if (PUBLIC_PATHS.includes(pathname ?? "")) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <div className="min-h-screen bg-[var(--sevs-bg)]" />;
  }

  const isAdminRole =
    member?.role === "ELECTION_OFFICER" ||
    member?.role === "ADMINISTRATOR" ||
    member?.role === "AUDITOR";

  return (
    <div className="flex min-h-screen bg-[var(--sevs-bg)]">
      {isAdminRole ? <AdminSidebar /> : <VoterSidebar />}
      <div className="flex-1">{children}</div>
    </div>
  );
}