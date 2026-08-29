import type { ReactNode } from "react";
import { AuthTopNav } from "@/components/layout/AuthTopNav";

// A layout component for public pages that includes a top navigation bar and a main content area for rendering child components.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--sevs-bg)]">
      <AuthTopNav />
      <main>{children}</main>
    </div>
  );
}