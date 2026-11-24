"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { RoleSidebar } from "@/components/layout/RoleSidebar";
import {
  MobileBottomNav,
  hidesBottomNav,
} from "@/components/layout/MobileBottomNav";

const PUBLIC_PATHS = ["/", "/login", "/register"];

// Decides what wraps each page:
// - public pages (login, register) render on their own;
// - every other page needs a logged-in user, and gets the role's sidebar.
//
// This check runs in the browser because the session lives in a cookie that
// belongs to the backend's address, which the Next.js server cannot see. It
// only decides what to show: the backend enforces every permission itself.
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { user, status } = useAuth();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (!isPublic && status === "anonymous") {
      // Come back to this page after logging in.
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isPublic, status, pathname, router]);

  if (isPublic) return <>{children}</>;

  if (status !== "authenticated" || !user) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[var(--sevs-bg)]"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-[var(--sevs-text-muted)]">
          {status === "loading"
            ? "Checking your session…"
            : "Redirecting to login…"}
        </p>
      </div>
    );
  }

  return (
    // The page scrolls inside the right-hand column, never the whole window.
    // "relative" makes that column the anchor for absolutely positioned
    // children (e.g. the screen-reader-only "sr-only" labels); without it they
    // anchor to <body>, escape the scroll box and add empty space below the app.
    // On phones the bottom bar covers the last ~4.5rem of the screen, so the
    // scroll column gets that much padding at the bottom (none on the ballot,
    // where the bar is hidden, and none from md up, where the sidebar is used).
    <div className="flex h-dvh overflow-hidden bg-[var(--sevs-bg)]">
      <RoleSidebar role={user.role} />
      <div
        className={`relative min-w-0 flex-1 overflow-y-auto md:pb-0 ${
          hidesBottomNav(pathname)
            ? ""
            : "pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
        }`}
      >
        {children}
      </div>
      <MobileBottomNav role={user.role} />
    </div>
  );
}
