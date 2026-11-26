"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

const KEY = "sevs.mfaSuggestionDismissed";
const MAX_DISMISSALS = 2;

function readDismissals(): number {
  try {
    return Number(window.localStorage.getItem(KEY) ?? "0") || 0;
  } catch {
    return 0;
  }
}

// Optional nudge for members who have not turned on two-factor sign-in.
// "Not now" hides it; after two dismissals it stops appearing on this browser.
export function TwoFactorSuggestion() {
  const profile = useProfile();
  const [dismissals, setDismissals] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setDismissals(readDismissals());
  }, []);

  if (hidden || dismissals === null || dismissals >= MAX_DISMISSALS) return null;
  if (!profile.data || profile.data.mfaEnabled) return null;

  function notNow() {
    const next = (dismissals ?? 0) + 1;
    try {
      window.localStorage.setItem(KEY, String(next));
    } catch {
      // storage unavailable: hide for this visit only
    }
    setHidden(true);
  }

  return (
    <section
      aria-labelledby="mfa-suggest-heading"
      className="relative flex flex-col gap-3 rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3 pr-8 sm:pr-0">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sevs-navy)]" aria-hidden="true" />
        <div>
          <h2 id="mfa-suggest-heading" className="font-bold text-[var(--sevs-navy)]">
            Protect your account <span className="font-normal text-[var(--sevs-text-muted)]">(optional)</span>
          </h2>
          <p className="mt-1 text-sm text-[var(--sevs-text-body)]">
            Add a code from your phone when you sign in, so nobody can vote as you with just your password.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link href="/profile#security-heading" className="rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]">
          Set up
        </Link>
        <button onClick={notNow} className="rounded-lg border border-[var(--sevs-border)] px-4 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50">
          Not now
        </button>
      </div>
      <button
        onClick={notNow}
        aria-label="Dismiss suggestion"
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--sevs-text-muted)] hover:bg-gray-100 sm:hidden"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
}