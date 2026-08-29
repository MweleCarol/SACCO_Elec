"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, X, ShieldCheck } from "lucide-react";
import { clearSession } from "@/lib/session";
import { NAV_CONFIG } from "@/components/layout/RoleSidebar";
import { formatRoleLabel } from "@/lib/format";
import type { UserRole } from "@/types/member";

interface MobileNavDrawerProps {
  role: UserRole;
  onClose: () => void;
}

export function MobileNavDrawer({ role, onClose }: MobileNavDrawerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const config = NAV_CONFIG[role];

  function handleLogout() {
    clearSession();
    onClose();
    router.push("/login");
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/40 animate-[fade-in_0.2s_ease-out]" onClick={onClose} />

      <div className="absolute left-0 top-0 h-full w-[78%] max-w-xs bg-[var(--sevs-navy)] text-white shadow-xl animate-[slide-in_0.25s_ease-out]">
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            <div>
              <p className="text-base font-extrabold tracking-tight">SEVS</p>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/50">
                {config.portalLabel}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1 px-3">
          {config.items.map(({ href, label, icon: Icon }) => {
            const isActive = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                  isActive ? "bg-white/10 text-white" : "text-white/70"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 px-4 py-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/70"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
}