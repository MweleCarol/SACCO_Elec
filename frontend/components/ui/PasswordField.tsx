"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string; // guidance shown before any error, e.g. password rules
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ label, error, hint, className, id, name, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const inputId = id ?? name;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="mb-3">
        <label htmlFor={inputId} className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={visible ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
            className={clsx(
              "w-full rounded-lg border border-[var(--sevs-border)] bg-white px-3 py-2.5 pr-10 text-sm",
              "text-[var(--sevs-text-body)] placeholder:text-gray-400",
              "focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20",
              error && "border-red-400 focus:ring-red-200",
              className
            )}
            {...props}
          />
          {/* Reachable by keyboard (it used to be skipped with tabIndex={-1}). */}
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-[var(--sevs-navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sevs-navy)]/40"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {hint && (
          <p id={hintId} className="mt-1 text-xs text-[var(--sevs-text-muted)]">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);