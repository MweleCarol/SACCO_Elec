"use client";

import { useEffect, useId, useRef } from "react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "danger" | "default";
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// A modal question. Screen readers announce it as a dialog with its title and
// message; focus starts on "Cancel" (the safe choice), Tab stays inside the
// dialog, Escape cancels, and focus returns to the button that opened it.
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  tone = "default",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isLoading) {
        e.preventDefault();
        onCancel();
      }
      if (e.key === "Tab" && dialogRef.current) {
        const buttons = Array.from(
          dialogRef.current.querySelectorAll<HTMLButtonElement>(
            "button:not([disabled])",
          ),
        );
        if (buttons.length === 0) return;
        const first = buttons[0]!;
        const last = buttons[buttons.length - 1]!;
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={isLoading ? undefined : onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="relative w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <h2 id={titleId} className="text-lg font-bold text-[var(--sevs-navy)]">
          {title}
        </h2>
        <p id={messageId} className="mt-2 text-sm text-[var(--sevs-text-body)]">
          {message}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-[var(--sevs-border)] py-2.5 text-sm font-bold text-[var(--sevs-text-body)] hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-60 ${
              tone === "danger"
                ? "bg-red-700 hover:bg-red-800"
                : "bg-[var(--sevs-navy)] hover:bg-[var(--sevs-navy-hover)]"
            }`}
          >
            {isLoading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
