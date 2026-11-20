import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string; // guidance shown before any error, e.g. format rules
}

export function FormField({ label, error, hint, className, id, name, ...props }: FormFieldProps) {
  const inputId = id ?? name;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="mb-3">
      <label htmlFor={inputId} className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        // Screen readers announce the hint and the error with the field.
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={clsx(
          "w-full rounded-lg border border-[var(--sevs-border)] bg-white px-3 py-2.5 text-sm",
          "text-[var(--sevs-text-body)] placeholder:text-gray-400",
          "focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20",
          error && "border-red-400 focus:ring-red-200",
          className
        )}
        {...props}
      />
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