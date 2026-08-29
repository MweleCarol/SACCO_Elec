"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { clearSession } from "@/lib/session";
import type { NavItem } from "@/components/layout/RoleSidebar";

// Props for the "More" sheet that displays additional navigation items on mobile devices
interface MoreSheetProps {
  items: NavItem[];
  onClose: () => void;
}
// Sheet for displaying additional navigation items on mobile devices
export function MoreSheet({ items, onClose }: MoreSheetProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    clearSession();
    onClose();
    router.push("/login");
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop — tap to dismiss (user control & freedom) */}
      <div className="absolute inset-0 bg-black/40 animate-[fade-in_0.2s_ease-out]" onClick={onClose} />

      <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl animate-[slide-up_0.25s_ease-out]">
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-gray-300" />
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-400" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 pb-2 pt-4">
          {items.map(({ href, label, icon: Icon }) => {
            const isActive = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-base font-medium ${
                  isActive ? "bg-[var(--sevs-navy)]/5 text-[var(--sevs-navy)]" : "text-[var(--sevs-text-body)]"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-4 rounded-xl px-4 py-3.5 text-base font-medium text-red-600"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}