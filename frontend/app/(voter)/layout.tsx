import type { ReactNode } from "react";
import { VoterSidebar } from "@/components/layout/VoterSidebar";

// VoterLayout component that wraps the main content with a sidebar for voter-related pages.
export default function VoterLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--sevs-bg)]">
      <VoterSidebar />
      <div className="flex-1">{children}</div>
    </div>
  );
}