"use client";

import { useState } from "react";
import { Bell, Menu } from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { formatRoleLabel } from "@/lib/format";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";

interface TopbarProps {
  title: string;
  subtitle?: string;
  notificationCount?: number;
}

export function Topbar({ title, subtitle, notificationCount = 0 }: TopbarProps) {
  const { member } = useCurrentMember();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between border-b border-[var(--sevs-border)] bg-white px-4 py-4 sm:px-8 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="shrink-0 text-[var(--sevs-navy)] md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold text-[var(--sevs-navy)] sm:text-2xl">{title}</h1>
            {subtitle && <p className="truncate text-xs text-[var(--sevs-text-muted)] sm:text-sm">{subtitle}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          <div className="relative">
            <Bell className="h-5 w-5 text-[var(--sevs-text-muted)]" />
            {notificationCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {notificationCount}
              </span>
            )}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-[var(--sevs-navy)]">{member?.name ?? "Guest"}</p>
            <p className="text-xs text-[var(--sevs-text-muted)]">
              {member ? formatRoleLabel(member.role) : "Not signed in"}
            </p>
          </div>
        </div>
      </header>

      {drawerOpen && <MobileNavDrawer role={member?.role ?? "MEMBER"} onClose={() => setDrawerOpen(false)} />}
    </>
  );
}