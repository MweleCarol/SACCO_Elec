import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormField({ label, error, className, id, name, ...props }: FormFieldProps) {
  const inputId = id ?? name;
  return (
    <div className="mb-3">
      <label htmlFor={inputId} className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]">
        {label}
      </label>
      <input
        id={inputId}
        name={name}
        className={clsx(
          "w-full rounded-lg border border-[var(--sevs-border)] bg-white px-3 py-2.5 text-sm",
          "text-[var(--sevs-text-body)] placeholder:text-gray-400",
          "focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20",
          error && "border-red-400 focus:ring-red-200",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}