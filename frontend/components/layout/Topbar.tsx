"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Search, X } from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { formatRoleLabel } from "@/lib/format";
import { MobileNavDrawer } from "@/components/layout/MobileNavDrawer";
import { hidesBottomNav } from "@/components/layout/MobileBottomNav";
import { NotificationPanel } from "@/components/voter/NotificationPanel";
import {
  useMarkRead,
  useRecentNotifications,
  useUnreadCount,
} from "@/hooks/useNotifications";
import { searchGlobal, type SearchResult } from "@/services/mock/global-search";

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const router = useRouter();
  const { member } = useCurrentMember();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showMenuButton = hidesBottomNav(usePathname());
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const bellRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const unreadCount = useUnreadCount(!!member).data ?? 0;
  const recent = useRecentNotifications(panelOpen);
  const markRead = useMarkRead();
  const results = searchGlobal(query);
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.group] ??= []).push(r);
    return acc;
  }, {});

  useEffect(() => {
    if (!panelOpen && query === "") return;

    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node))
        setPanelOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setQuery("");
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPanelOpen(false);
        setQuery("");
        setMobileSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [panelOpen, query]);

  function goTo(href: string) {
    setQuery("");
    setMobileSearchOpen(false);
    router.push(href);
  }

  const resultsDropdown = query.trim().length >= 2 && (
    <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-[var(--sevs-border)] bg-white shadow-lg">
      {results.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-[var(--sevs-text-muted)]">
          No results for &ldquo;{query}&rdquo;
        </p>
      ) : (
        Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <p className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
              {group}
            </p>
            {items.map((r) => (
              <button
                key={`${r.group}-${r.id}`}
                onClick={() => goTo(r.href)}
                className="block w-full px-4 py-2 text-left hover:bg-[var(--sevs-bg)]"
              >
                <p className="text-sm font-semibold text-[var(--sevs-navy)]">
                  {r.label}
                </p>
                {r.sublabel && (
                  <p className="text-xs text-[var(--sevs-text-muted)]">
                    {r.sublabel}
                  </p>
                )}
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  );

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-[var(--sevs-border)] bg-white px-4 py-4 sm:px-8 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          {/* Phones use the bottom bar; the menu button only appears where
              that bar is hidden (the ballot), so there is always a way out. */}
          {showMenuButton && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="shrink-0 text-[var(--sevs-navy)] md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold text-[var(--sevs-navy)] sm:text-2xl">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-xs text-[var(--sevs-text-muted)] sm:text-sm">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Desktop/tablet: inline search */}
        <div ref={searchRef} className="relative hidden w-72 shrink-0 lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search audit logs, events, users, or elections..."
            className="w-full rounded-lg border border-[var(--sevs-border)] py-2.5 pl-9 pr-3 text-sm focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20"
          />
          {resultsDropdown}
        </div>

        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="text-[var(--sevs-text-muted)] lg:hidden"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setPanelOpen((v) => !v)}
              className="relative"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              aria-expanded={panelOpen}
            >
              <Bell className="h-5 w-5 text-[var(--sevs-text-muted)]" />
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {panelOpen && member && (
              <NotificationPanel
                notifications={recent.data}
                role={member.role}
                onOpen={(n) => {
                  if (!n.read) markRead.mutate(n.id);
                }}
                onClose={() => setPanelOpen(false)}
              />
            )}
          </div>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-[var(--sevs-navy)]">
              {member?.name ?? "Guest"}
            </p>
            <p className="text-xs text-[var(--sevs-text-muted)]">
              {member ? formatRoleLabel(member.role) : "Not signed in"}
            </p>
          </div>
        </div>
      </header>

      {/* Mobile: full-screen search overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-white md:hidden">
          <div className="flex items-center gap-2 border-b border-[var(--sevs-border)] px-4 py-4">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search audit logs, events, users..."
                className="w-full rounded-lg border border-[var(--sevs-border)] py-2.5 pl-9 pr-3 text-sm focus:border-[var(--sevs-navy)] focus:outline-none"
              />
            </div>
            <button
              onClick={() => {
                setMobileSearchOpen(false);
                setQuery("");
              }}
              aria-label="Close search"
            >
              <X className="h-5 w-5 text-[var(--sevs-text-muted)]" />
            </button>
          </div>
          <div className="overflow-y-auto">
            {query.trim().length >= 2 &&
              (results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--sevs-text-muted)]">
                  No results for &ldquo;{query}&rdquo;
                </p>
              ) : (
                Object.entries(grouped).map(([group, items]) => (
                  <div key={group}>
                    <p className="px-4 pt-4 pb-1 text-xs font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
                      {group}
                    </p>
                    {items.map((r) => (
                      <button
                        key={`${r.group}-${r.id}`}
                        onClick={() => goTo(r.href)}
                        className="block w-full px-4 py-3 text-left active:bg-[var(--sevs-bg)]"
                      >
                        <p className="text-sm font-semibold text-[var(--sevs-navy)]">
                          {r.label}
                        </p>
                        {r.sublabel && (
                          <p className="text-xs text-[var(--sevs-text-muted)]">
                            {r.sublabel}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                ))
              ))}
          </div>
        </div>
      )}

      {drawerOpen && (
        <MobileNavDrawer
          role={member?.role ?? "MEMBER"}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
