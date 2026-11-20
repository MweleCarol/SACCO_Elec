import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

// RootLayout component that serves as the main layout for the application,
// wrapping the content with the AppShell component and providing metadata for the page.
export const metadata: Metadata = {
  title: "SEVS — SACCO Electronic Voting System",
  description:
    "AI-Assisted Secure Electronic Voting System for SACCO Elections",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
