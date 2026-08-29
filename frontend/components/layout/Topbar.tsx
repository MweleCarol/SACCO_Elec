"use client";

import { Bell } from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";

// Props for the Topbar component
interface TopbarProps {
  title: string;
  subtitle?: string;
  notificationCount?: number;
}

// Topbar component that displays the title, subtitle, notification count, and current member information.
export function Topbar({ title, subtitle, notificationCount = 0 }: TopbarProps) {
  const { member } = useCurrentMember();

  return (
    <header className="flex items-center justify-between border-b border-[var(--sevs-border)] bg-white px-8 py-5">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--sevs-navy)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--sevs-text-muted)]">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-6">
        <div className="relative">
          <Bell className="h-5 w-5 text-[var(--sevs-text-muted)]" />
          {notificationCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {notificationCount}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-[var(--sevs-navy)]">{member?.name ?? "Guest"}</p>
          <p className="text-xs text-[var(--sevs-text-muted)]">{member ? "Member" : "Not signed in"}</p>
        </div>
      </div>
    </header>
  );
}