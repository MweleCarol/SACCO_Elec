"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";

interface CodeDialogProps {
  title: string;
  message: string;
  askPassword?: boolean;
  confirmLabel: string;
  tone?: "danger" | "default";
  isLoading?: boolean;
  serverError?: string | null;
  onConfirm: (values: { password: string; totpCode: string }) => void;
  onCancel: () => void;
}

// Asks for a current app code (and optionally the password) before a
// sensitive two-factor change. Accessible dialog: focus starts in the first
// field and stays inside; Escape cancels; focus returns to the opener.
export function CodeDialog({
  title, message, askPassword = false, confirmLabel, tone = "default", isLoading = false, serverError, onConfirm, onCancel,
}: CodeDialogProps) {
  const ids = { title: useId(), message: useId(), pw: useId(), code: useId(), pwErr: useId(), codeErr: useId() };
  const dialogRef = useRef<HTMLDivElement>(null);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<{ password?: string; code?: string }>({});

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isLoading) {
        e.preventDefault();
        onCancel();
      }
      if (e.key === "Tab" && dialogRef.current) {
        const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("input, button:not([disabled])"));
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

  function submit(e: FormEvent) {
    e.preventDefault();
    const found: typeof errors = {};
    if (askPassword && !password) found.password = "Enter your password.";
    if (!/^\d{6}$/.test(code.trim())) found.code = "Enter the 6-digit code from your app.";
    setErrors(found);
    if (found.password) return document.getElementById(ids.pw)?.focus();
    if (found.code) return document.getElementById(ids.code)?.focus();
    onConfirm({ password, totpCode: code.trim() });
  }

  const input =
    "w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20 aria-[invalid=true]:border-red-500";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40" onClick={isLoading ? undefined : onCancel} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.title}
        aria-describedby={ids.message}
        className="relative w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-2xl"
      >
        <form onSubmit={submit} noValidate>
          <h2 id={ids.title} className="text-lg font-bold text-[var(--sevs-navy)]">{title}</h2>
          <p id={ids.message} className="mt-2 text-sm text-[var(--sevs-text-body)]">{message}</p>
          {askPassword && (
            <div className="mt-4">
              <label htmlFor={ids.pw} className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]">Password</label>
              <input
                id={ids.pw}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((x) => ({ ...x, password: undefined }));
                }}
                aria-invalid={errors.password ? true : undefined}
                aria-describedby={errors.password ? ids.pwErr : undefined}
                className={input}
              />
              {errors.password && <p id={ids.pwErr} role="alert" className="mt-1 text-xs text-red-700">{errors.password}</p>}
            </div>
          )}
          <div className="mt-4">
            <label htmlFor={ids.code} className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]">6-digit code from your app</label>
            <input
              id={ids.code}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setErrors((x) => ({ ...x, code: undefined }));
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              aria-invalid={errors.code ? true : undefined}
              aria-describedby={errors.code ? ids.codeErr : undefined}
              className={`${input} font-mono tracking-[0.3em]`}
            />
            {errors.code && <p id={ids.codeErr} role="alert" className="mt-1 text-xs text-red-700">{errors.code}</p>}
          </div>
          {serverError && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{serverError}</p>}
          <div className="mt-5 flex gap-3">
            <button type="button" onClick={onCancel} disabled={isLoading} className="flex-1 rounded-lg border border-[var(--sevs-border)] py-2.5 text-sm font-bold text-[var(--sevs-text-body)] hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-60 ${tone === "danger" ? "bg-red-700 hover:bg-red-800" : "bg-[var(--sevs-navy)] hover:bg-[var(--sevs-navy-hover)]"}`}
            >
              {isLoading ? "Please wait…" : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}