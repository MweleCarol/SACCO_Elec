"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home, Vote, UserCircle, Users, CheckSquare, ScrollText, BarChart3,
  Sparkles, RefreshCw, Settings, ClipboardList, Bell, LogOut, ShieldCheck,
} from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { clearSession } from "@/lib/session";
import { formatRoleLabel } from "@/lib/format";
import type { UserRole } from "@/types/member";

export interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  primary?: boolean; // shown in mobile bottom bar; rest live under "More"
}

export const NAV_CONFIG: Record<UserRole, { portalLabel: string; items: NavItem[] }> = {
  MEMBER: {
    portalLabel: "Member Portal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home, primary: true },
      { href: "/elections", label: "Elections", icon: Vote, primary: true },
      { href: "/candidates", label: "Candidates", icon: Users, primary: true },
      { href: "/my-candidacy", label: "My Candidacy", icon: UserCircle },
      { href: "/my-voting-activity", label: "Activity", icon: ClipboardList, primary: true },
      { href: "/results", label: "Results", icon: BarChart3 },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/profile", label: "Profile", icon: Settings },
       
    ],
  },
  ELECTION_OFFICER: {
    portalLabel: "Officer Portal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home, primary: true },
      { href: "/elections", label: "Elections", icon: Vote, primary: true },
      { href: "/candidates", label: "Candidates", icon: UserCircle, primary: true },
      { href: "/approvals", label: "Approvals", icon: CheckSquare, primary: true },
      { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/ai-governance", label: "AI Insights", icon: Sparkles },
    ],
  },
  ADMINISTRATOR: {
    portalLabel: "Admin Portal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home, primary: true },
      { href: "/users", label: "Users", icon: Users, primary: true },
      { href: "/elections", label: "Elections", icon: Vote, primary: true },
      { href: "/approvals", label: "Approvals", icon: CheckSquare, primary: true },
      { href: "/membership-sync", label: "Membership", icon: RefreshCw },
      { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/ai-governance", label: "AI Monitor", icon: Sparkles },
    ],
  },
  AUDITOR: {
    portalLabel: "Auditor Portal",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home, primary: true },
      { href: "/elections", label: "Elections", icon: Vote, primary: true },
      { href: "/audit-logs", label: "Audit Logs", icon: ScrollText, primary: true },
      { href: "/reports", label: "Reports", icon: BarChart3, primary: true },
      { href: "/ai-governance", label: "AI Insights", icon: Sparkles },
    ],
  },
};

interface RoleSidebarProps {
  role: UserRole;
}

export function RoleSidebar({ role }: RoleSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { member } = useCurrentMember();
  const config = NAV_CONFIG[role];

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col bg-[var(--sevs-navy)] text-white md:flex">
      <div className="flex items-center gap-2 px-6 py-6">
        <ShieldCheck className="h-6 w-6" />
        <div>
          <p className="text-lg font-extrabold tracking-tight">SEVS</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
            {config.portalLabel}
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {config.items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <button
          onClick={handleLogout}
          className="mb-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
        <div className="flex items-center gap-2 px-3">
          <span className="h-2 w-2 rounded-full bg-green-400" />
          <div>
            <p className="text-xs font-bold">{member?.name ?? "Guest"}</p>
            <p className="text-[10px] text-white/50">
              {member ? formatRoleLabel(member.role) : "Not signed in"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}