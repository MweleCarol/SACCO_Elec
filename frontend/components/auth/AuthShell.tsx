import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  subtitle: string;
  footerNote?: string;
  bottomLink?: ReactNode;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, footerNote, bottomLink, children }: AuthShellProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-6 md:py-8">
      <h1 className="text-center text-2xl font-extrabold text-[var(--sevs-navy)] md:text-3xl">
        {title}
      </h1>
      <p className="mt-1.5 text-center text-sm text-[var(--sevs-text-muted)]">{subtitle}</p>

      <div className="mt-6 w-full rounded-t-3xl rounded-b-2xl bg-white px-5 py-6 shadow-xl md:px-8 md:py-8">
        {children}
      </div>

      {footerNote && (
        <p className="mt-4 text-center text-xs text-[var(--sevs-text-muted)]">{footerNote}</p>
      )}
      {bottomLink && <div className="mt-3 text-center text-sm">{bottomLink}</div>}
    </div>
  );
}