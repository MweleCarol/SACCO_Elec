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
// When a page under "More" is open, "More" is the highlighted item.
export function MobileBottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const config = NAV_CONFIG[role];

  if (hidesBottomNav(pathname)) return null;

  const primaryItems = config.items.filter((i) => i.primary);
  const secondaryItems = config.items.filter((i) => !i.primary);
  const moreActive = secondaryItems.some((i) => isActivePath(pathname, i.href));

  // Every entry in the bar: the main pages, then "More".
  const entries = [
    ...primaryItems.map((i) => ({ key: i.href, label: i.label, Icon: i.icon, href: i.href, active: isActivePath(pathname, i.href) })),
    ...(secondaryItems.length > 0
      ? [{ key: "more", label: "More", Icon: MoreHorizontal, href: null, active: moreActive || moreOpen }]
      : []),
  ];

  return (
    <>
      {/* A floating bar. Only the active page shows its name, in a pill;
          the others are icons, with a tooltip on hover or keyboard focus and
          a proper accessible name for screen readers. This keeps every
          button full-size even on narrow (320-360 px) phones. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] min-[360px]:px-3 md:hidden"
      >
        <ul className="mx-auto flex max-w-md items-center justify-between gap-0.5 rounded-2xl border border-[var(--sevs-border)] bg-white px-1 py-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.08)] min-[360px]:px-2">
          {entries.map(({ key, label, Icon, href, active }, index) => {
            const edge = index === 0 ? "left-0" : index === entries.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2";
            const look = clsx(
              "group relative flex h-11 items-center justify-center rounded-full transition-all duration-200 motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sevs-navy)] focus-visible:ring-offset-2",
              active
                ? "gap-1 bg-[var(--sevs-navy)]/10 px-3 text-[var(--sevs-navy)] min-[360px]:gap-1.5 min-[360px]:px-3.5"
                : "w-11 text-gray-600 hover:bg-gray-100"
            );
            const content = (
              <>
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                {active ? (
                  <span className="whitespace-nowrap text-xs font-bold min-[360px]:text-sm">{label}</span>
                ) : (
                  // Visual tooltip only; the accessible name comes from aria-label.
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "pointer-events-none absolute bottom-full mb-2 hidden whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow",
                      "group-hover:block group-focus-visible:block",
                      edge
                    )}
                  >
                    {label}
                  </span>
                )}
              </>
            );
            return (
              <li key={key}>
                {href ? (
                  <Link
                    href={href}
                    aria-label={active ? undefined : label}
                    aria-current={active ? "page" : undefined}
                    className={look}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    ref={moreButtonRef}
                    type="button"
                    onClick={() => setMoreOpen(true)}
                    aria-label={active ? undefined : label}
                    aria-haspopup="dialog"
                    aria-expanded={moreOpen}
                    className={look}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
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