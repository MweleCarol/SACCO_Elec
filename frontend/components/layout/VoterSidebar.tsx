"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Vote,
  Users,
  ClipboardList,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { clearSession } from "@/lib/session";

// Define the navigation items for the voter sidebar
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/elections", label: "Elections", icon: Vote },
  { href: "/candidates", label: "Candidates", icon: Users },
  { href: "/my-voting-activity", label: "My Voting Activity", icon: ClipboardList },
  { href: "/results", label: "Results", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: Settings },
];

// VoterSidebar component that renders the sidebar for voters
export function VoterSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { member } = useCurrentMember();

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-64 flex-col bg-[var(--sevs-navy)] text-white">
      <div className="flex items-center gap-2 px-6 py-6">
        <ShieldCheck className="h-6 w-6" />
        <div>
          <p className="text-lg font-extrabold tracking-tight">SEVS</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
            Member Portal
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
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
            <p className="text-[10px] text-white/50">{member ? "Member" : "Not signed in"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}