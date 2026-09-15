"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Menu } from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { formatRoleLabel } from "@/lib/format";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { NotificationPanel } from "@/components/voter/NotificationPanel";
import { getNotificationsByMember } from "@/services/mock/notifications";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { member } = useCurrentMember();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const notifications = member ? getNotificationsByMember(member.id) : [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!panelOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setPanelOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [panelOpen]);

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
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="relative"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              aria-expanded={panelOpen}
            >
              <Bell className="h-5 w-5 text-[var(--sevs-text-muted)]" />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {panelOpen && (
              <NotificationPanel notifications={notifications.slice(0, 5)} onClose={() => setPanelOpen(false)} />
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