"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { RoleSidebar } from "@/components/layout/RoleSidebar";
import type { UserRole } from "@/types/member";

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password"];

// The AppShell component serves as the main layout for the application, determining which sidebar to display based on the user's role and the current path. 
// It checks if the current path is public, and if so, it renders the children directly.
//  If the user is still loading, it shows a loading state. 
// Depending on whether the user is a member or has a specific role, it renders either the VoterSidebar or the RoleSidebar with appropriate navigation items.

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { member, isLoading } = useCurrentMember();

  if (PUBLIC_PATHS.includes(pathname ?? "")) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <div className="min-h-screen bg-[var(--sevs-bg)]" />;
  }

  return (
    <div className="flex h-screen bg-[var(--sevs-bg)]">
      <RoleSidebar role={member?.role ?? "MEMBER"} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}