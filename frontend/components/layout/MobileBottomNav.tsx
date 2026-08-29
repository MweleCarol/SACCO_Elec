"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { NAV_CONFIG } from "@/components/layout/RoleSidebar";
import { MoreSheet } from "@/components/layout/MoreSheet";
import type { UserRole } from "@/types/member";

interface MobileBottomNavProps {
  role: UserRole;
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const config = NAV_CONFIG[role];

  const primaryItems = config.items.filter((i) => i.primary);
  const secondaryItems = config.items.filter((i) => !i.primary);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--sevs-border)] bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {primaryItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "text-[var(--sevs-navy)]" : "text-gray-400"}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-semibold ${isActive ? "text-[var(--sevs-navy)]" : "text-gray-400"}`}>
                {label}
              </span>
            </Link>
          );
        })}

        {secondaryItems.length > 0 && (
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-1 py-2.5"
          >
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
            <span className="text-[10px] font-semibold text-gray-400">More</span>
          </button>
        )}
      </nav>

      {moreOpen && <MoreSheet items={secondaryItems} onClose={() => setMoreOpen(false)} />}
    </>
  );
}