"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

interface PasswordFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ label, error, className, id, name, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const inputId = id ?? name;

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
            className={clsx(
              "w-full rounded-lg border border-[var(--sevs-border)] bg-white px-3 py-2.5 pr-10 text-sm",
              "text-[var(--sevs-text-body)] placeholder:text-gray-400",
              "focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20",
              error && "border-red-400 focus:ring-red-200",
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[var(--sevs-navy)]"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);