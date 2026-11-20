import type { ReactNode } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

// Shown while data loads, instead of a blank page.
export function LoadingCards({ count = 3, label = "Loading…" }: { count?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl border border-[var(--sevs-border)] bg-white" />
      ))}
    </div>
  );
}

// A failed load: say what happened and offer the obvious next step.
export function ErrorPanel({
  message,
  onRetry,
  backHref,
  backLabel = "Back to elections",
}: {
  message: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-red-800">{message}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {onRetry && (
            <button onClick={onRetry} className="text-sm font-bold text-[var(--sevs-navy)] hover:underline">
              Try again
            </button>
          )}
          {backHref && (
            <Link href={backHref} className="text-sm font-bold text-[var(--sevs-navy)] hover:underline">
              {backLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--sevs-border)] bg-white px-6 py-10 text-center">
      <p className="font-bold text-[var(--sevs-navy)]">{title}</p>
      {children && <div className="mt-1 text-sm text-[var(--sevs-text-muted)]">{children}</div>}
    </div>
  );
}