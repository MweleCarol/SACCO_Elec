import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export function Button({ className, isLoading, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "w-full rounded-lg bg-[var(--sevs-navy)] px-5 py-2.5 text-sm font-bold text-white transition",
        "hover:bg-[var(--sevs-navy-hover)] disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "Please wait..." : children}
    </button>
  );
}