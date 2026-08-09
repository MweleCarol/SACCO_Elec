"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Vote,
  History,
  Bell,
  User,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/elections", label: "Elections", icon: Vote },
  { href: "/history", label: "History", icon: History },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
] as const;

// Mock — replace with the authenticated member and unread count from the API.
const CURRENT_MEMBER = { name: "Wanjiru Mwangi", membershipNumber: "SACCO-2024-0123" };
const UNREAD_NOTIFICATIONS = 3;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}

function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-[#0C1657] lg:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <ShieldCheck className="h-6 w-6 text-white" />
        <span className="text-lg font-bold tracking-tight text-white">SEVS</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {href === "/notifications" && UNREAD_NOTIFICATIONS > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-400 px-1 text-[0.65rem] font-semibold text-white">
                  {UNREAD_NOTIFICATIONS}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            {initials(CURRENT_MEMBER.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{CURRENT_MEMBER.name}</p>
            <p className="truncate font-mono text-[0.7rem] text-white/50">
              {CURRENT_MEMBER.membershipNumber}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function MobileTopBar() {
  const pathname = usePathname();
  const activeItem = NAV_ITEMS.find((item) => isActive(pathname, item.href));

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-[#0C1657] px-4 py-3.5 lg:hidden">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-white" />
        <span className="text-sm font-semibold text-white">{activeItem?.label ?? "SEVS"}</span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/notifications" className="relative text-white/80 hover:text-white">
          <Bell className="h-5 w-5" />
          {UNREAD_NOTIFICATIONS > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-400 px-1 text-[0.6rem] font-semibold text-white">
              {UNREAD_NOTIFICATIONS}
            </span>
          )}
        </Link>
        <Link
          href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[0.7rem] font-semibold text-white"
        >
          {initials(CURRENT_MEMBER.name)}
        </Link>
      </div>
    </header>
  );
}

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.65rem] font-medium ${
              active ? "text-[#0C1657]" : "text-slate-400"
            }`}
          >
            <span className="relative">
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              {href === "/notifications" && UNREAD_NOTIFICATIONS > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-400 text-[0.55rem] font-semibold text-white">
                  {UNREAD_NOTIFICATIONS}
                </span>
              )}
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F2F4F7]">
      <Sidebar />
      <div className="lg:pl-64">
        <MobileTopBar />
        <main className="mx-auto max-w-5xl px-4 py-5 pb-24 sm:px-6 sm:py-8 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}