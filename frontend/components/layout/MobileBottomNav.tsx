"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { MoreHorizontal } from "lucide-react";
import { NAV_CONFIG } from "@/components/layout/RoleSidebar";
import { MoreSheet } from "@/components/layout/MoreSheet";
import type { UserRole } from "@/types/member";

// Pages where the bar is hidden. On the ballot it would cover the sticky
// "Review my choices" bar and pull attention away from voting; the top bar's
// menu button is shown there instead, so members are never stuck.
const HIDDEN_ON = ["/vote/"];

export function hidesBottomNav(pathname: string | null): boolean {
  return HIDDEN_ON.some((p) => pathname?.startsWith(p));
}

// "/elections" is active on "/elections/123" but not on "/elections-archive".
function isActivePath(pathname: string | null, href: string): boolean {
  return pathname === href || !!pathname?.startsWith(`${href}/`);
}

// Phone navigation: the role's four main pages, plus "More" for the rest.
// Within thumb reach and always visible, unlike a menu behind a ☰ button.
// Hidden from md (tablet) upwards, where the sidebar takes over.
export function MobileBottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const config = NAV_CONFIG[role];

  if (hidesBottomNav(pathname)) return null;

  const primaryItems = config.items.filter((i) => i.primary);
  const secondaryItems = config.items.filter((i) => !i.primary);
  const moreActive = secondaryItems.some((i) => isActivePath(pathname, i.href));

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--sevs-border)] bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_rgba(0,0,0,0.04)] md:hidden"
      >
        <ul className="flex">
          {primaryItems.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs",
                    active ? "font-bold text-[var(--sevs-navy)]" : "font-medium text-gray-600"
                  )}
                >
                  {/* The pill behind the active icon: a shape cue, not colour alone. */}
                  <span className={clsx("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-[var(--sevs-navy)]/10")}>
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                  </span>
                  <span className="max-w-full truncate">{label}</span>
                </Link>
              </li>
            );
          })}

          {secondaryItems.length > 0 && (
            <li className="flex-1">
              <button
                ref={moreButtonRef}
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
                className={clsx(
                  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-xs",
                  moreActive ? "font-bold text-[var(--sevs-navy)]" : "font-medium text-gray-600"
                )}
              >
                <span className={clsx("flex h-7 w-12 items-center justify-center rounded-full", moreActive && "bg-[var(--sevs-navy)]/10")}>
                  <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                </span>
                More
              </button>
            </li>
          )}
        </ul>
      </nav>

      {moreOpen && (
        <MoreSheet
          items={secondaryItems}
          onClose={() => {
            setMoreOpen(false);
            moreButtonRef.current?.focus(); // back to where the user was
          }}
        />
      )}
    </>
  );
}