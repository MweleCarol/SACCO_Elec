"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { NavItem } from "@/components/layout/RoleSidebar";

interface MoreSheetProps {
  items: NavItem[];
  onClose: () => void;
}

// The "More" pages on phones, as a bottom sheet. Announced as a dialog,
// focus starts inside it and stays there, Escape or tapping the backdrop
// closes it, and the caller puts focus back on the "More" button.
export function MoreSheet({ items, onClose }: MoreSheetProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const pathname = usePathname();
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sheetRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab" && sheetRef.current) {
        const focusable = Array.from(sheetRef.current.querySelectorAll<HTMLElement>("a, button"));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleLogout() {
    onClose();
    await logout(); // revokes the session on the server, not just in this tab
    router.push("/login");
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop: tap to dismiss (user control and freedom) */}
      <div className="absolute inset-0 bg-black/40 animate-[fade-in_0.2s_ease-out]" onClick={onClose} aria-hidden="true" />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="More pages"
        className="absolute bottom-0 left-0 right-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl animate-[slide-up_0.25s_ease-out]"
      >
        <div className="relative px-5 pt-4">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-gray-300" aria-hidden="true" />
          <button
            onClick={onClose}
            className="absolute right-3 top-2 flex h-10 w-10 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="More pages" className="px-3 pb-3 pt-4">
          <ul>
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || !!pathname?.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-base ${
                      active ? "bg-[var(--sevs-navy)]/5 font-bold text-[var(--sevs-navy)]" : "font-medium text-[var(--sevs-text-body)]"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-4 rounded-xl border-t border-[var(--sevs-border)] px-4 py-3.5 text-base font-medium text-red-700"
          >
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Logout
          </button>
        </nav>
      </div>

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      `}</style>
    </div>
  );
}