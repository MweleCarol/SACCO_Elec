"use client";

import { useEffect, useId, useRef, useState } from "react";

interface ReasonDialogProps {
  title: string;
  message: string;
  label: string; // e.g. "Reason"
  hint?: string; // who will see the text
  required?: boolean;
  // With required: the shortest acceptable text (e.g. 10 for reasons members see).
  minLength?: number;
  confirmLabel: string;
  tone?: "danger" | "default";
  isLoading?: boolean;
  error?: string | null;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}

// A confirmation that also asks for a short written reason (rejecting a
// candidate, sending an election back). Same behaviour as ConfirmDialog:
// announced as a dialog, focus starts in the text box and stays inside,
// Escape cancels, and focus returns to the button that opened it.
export function ReasonDialog({
  title, message, label, hint, required = false, minLength = 1, confirmLabel, tone = "default",
  isLoading = false, error, onConfirm, onCancel,
}: ReasonDialogProps) {
  const ids = { title: useId(), message: useId(), field: useId(), hint: useId(), err: useId() };
  const dialogRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    fieldRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isLoading) {
        e.preventDefault();
        onCancel();
      }
      if (e.key === "Tab" && dialogRef.current) {
        const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("textarea, button:not([disabled])"));
        const first = items[0];
        const last = items[items.length - 1];
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
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [onCancel, isLoading]);

  function confirm() {
    if (required && text.trim().length < minLength) {
      setMissing(true);
      fieldRef.current?.focus();
      return;
    }
    onConfirm(text.trim());
  }

  const describedBy = [hint ? ids.hint : "", missing ? ids.err : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={isLoading ? undefined : onCancel} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.title}
        aria-describedby={ids.message}
        className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <h2 id={ids.title} className="text-lg font-bold text-[var(--sevs-navy)]">{title}</h2>
        <p id={ids.message} className="mt-2 text-sm text-[var(--sevs-text-body)]">{message}</p>

        <label htmlFor={ids.field} className="mt-4 block text-xs font-bold text-[var(--sevs-navy)]">
          {label} {!required && <span className="font-normal text-[var(--sevs-text-muted)]">(optional)</span>}
        </label>
        {hint && <p id={ids.hint} className="mt-0.5 text-xs text-[var(--sevs-text-muted)]">{hint}</p>}
        <textarea
          ref={fieldRef}
          id={ids.field}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (missing) setMissing(false);
          }}
          rows={3}
          maxLength={500}
          aria-invalid={missing || undefined}
          aria-describedby={describedBy}
          className="mt-1 w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20 aria-[invalid=true]:border-red-500"
        />
        {missing && (
          <p id={ids.err} role="alert" className="mt-1 text-xs text-red-700">
            {minLength > 1 ? `Please write at least ${minLength} characters.` : "Please give a reason."}
          </p>
        )}
        {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-[var(--sevs-border)] py-2.5 text-sm font-bold text-[var(--sevs-text-body)] hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={isLoading}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-60 ${
              tone === "danger" ? "bg-red-700 hover:bg-red-800" : "bg-[var(--sevs-navy)] hover:bg-[var(--sevs-navy-hover)]"
            }`}
          >
            {isLoading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}