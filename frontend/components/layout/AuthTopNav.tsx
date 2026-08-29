"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield } from "lucide-react";

export function AuthTopNav() {
  const pathname = usePathname();
  const isLogin = pathname?.startsWith("/login");

  return (
    <header className="border-b border-[var(--sevs-border)] bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <Shield
            className="h-6 w-6 fill-[var(--sevs-navy)] text-[var(--sevs-navy)] drop-shadow-[0_0_6px_rgba(19,40,74,0.65)]"
            strokeWidth={1.5}
          />
          <span className="text-[var(--sevs-navy)] [text-shadow:0_2px_6px_rgba(19,40,74,0.35)]">
            SEVS
          </span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <span className="hidden text-[var(--sevs-text-muted)] sm:inline">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </span>
          <Link
            href={isLogin ? "/register" : "/login"}
            className="font-bold text-[var(--sevs-navy)] hover:underline"
          >
            {isLogin ? "Register" : "Login"}
          </Link>
        </div>
      </div>
    </header>
  );
}