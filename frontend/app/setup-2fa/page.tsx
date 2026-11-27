"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { formatRoleLabel } from "@/lib/format";
import { TwoFactorSetup } from "@/components/account/TwoFactorSetup";

// Shown to officers, administrators and auditors who have not set up
// two-factor sign-in. Nothing else opens until it is done (the backend
// refuses staff requests too), so this page has no sidebar.
export default function SetupTwoFactorPage() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  if (!user) return null;

  async function leave() {
    await logout().catch(() => {});
    window.location.replace("/login");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center p-4 sm:p-8">
      <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--sevs-navy)]">
            <ShieldCheck className="h-6 w-6 text-white" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-[var(--sevs-navy)]">Set up two-factor sign-in</h1>
            <p className="text-sm text-[var(--sevs-text-muted)]">
              {user.fullName} · {formatRoleLabel(user.role)}
            </p>
          </div>
        </div>
        <p className="text-sm text-[var(--sevs-text-body)]">
          Your role can change elections and approve sensitive actions, so SEVS needs a code from your phone as well as
          your password. It takes about two minutes. You will need it every time you sign in.
        </p>
        <TwoFactorSetup
          cancelLabel="Log out"
          finishLabel="Finish and continue"
          onCancel={leave}
          onDone={async () => {
            await refreshUser();
            router.replace("/dashboard");
          }}
        />
      </div>
    </main>
  );
}