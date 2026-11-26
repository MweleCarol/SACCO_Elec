"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import type { Profile } from "@/types/api";
import { useTwoFactor } from "@/hooks/useProfile";
import { getApiErrorMessage, getApiFieldErrors } from "@/services/api/errors";
import { ToneBadge } from "@/components/voter/ElectionStatusBadge";
import { TwoFactorSetup } from "@/components/account/TwoFactorSetup";
import { BackupCodesPanel } from "@/components/account/BackupCodesPanel";
import { CodeDialog } from "@/components/account/CodeDialog";

// Profile, Security: turn two-factor on, see backup codes left, get new codes,
// and (members only) turn it off again.
export function TwoFactorSection({ profile, onNotice }: { profile: Profile; onNotice: (m: string) => void }) {
  const twoFactor = useTwoFactor();
  const [mode, setMode] = useState<"idle" | "setup" | "regenerate" | "disable">("idle");
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const on = profile.mfaEnabled;
  const left = profile.backupCodesRemaining ?? 0;

  const dialogError = (err: unknown) => getApiFieldErrors(err)[0]?.message ?? getApiErrorMessage(err);

  return (
    <div className="rounded-xl border border-[var(--sevs-border)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {on ? (
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
          ) : (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-[var(--sevs-navy)]">Two-factor sign-in</h3>
            <p className="text-sm text-[var(--sevs-text-muted)]">
              {on
                ? "Signing in needs your password and a code from your phone."
                : profile.mfaRequired
                  ? "Required for your role. Set it up now."
                  : "Optional. Adds a code from your phone when you sign in, so a stolen password is not enough."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {on ? <ToneBadge label="On" tone="green" /> : <ToneBadge label="Off" tone="gray" />}
          {profile.mfaRequired && <ToneBadge label="Required for your role" tone="blue" />}
        </div>
      </div>

      {/* Setup stays mounted until the backup codes are saved, even though
          the profile already reports two-factor as on after the code is confirmed. */}
      {!on && mode !== "setup" && (
        <button
          onClick={() => setMode("setup")}
          className="mt-4 rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]"
        >
          Turn on
        </button>
      )}
      {mode === "setup" && (
        <TwoFactorSetup
          onCancel={() => setMode("idle")}
          onDone={(m) => {
            setMode("idle");
            onNotice(m);
          }}
        />
      )}

      {on && !newCodes && mode !== "setup" && (
        <div className="mt-4 space-y-3 border-t border-[var(--sevs-border)] pt-4">
          <p className="text-sm text-[var(--sevs-text-body)]">
            <strong>{left}</strong> backup code{left === 1 ? "" : "s"} left.
            {left <= 2 && " Get new codes soon so you are not locked out if you lose your phone."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setMode("regenerate")} className="rounded-lg border border-[var(--sevs-border)] px-4 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50">
              Get new backup codes
            </button>
            {!profile.mfaRequired && (
              <button onClick={() => setMode("disable")} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-50">
                Turn off
              </button>
            )}
          </div>
        </div>
      )}

      {newCodes && (
        <div className="mt-4 border-t border-[var(--sevs-border)] pt-4">
          <h3 className="mb-2 font-bold text-[var(--sevs-navy)]">Your new backup codes</h3>
          <BackupCodesPanel
            codes={newCodes}
            finishLabel="Done"
            onFinish={() => {
              setNewCodes(null);
              onNotice("New backup codes saved. The old ones no longer work.");
            }}
          />
        </div>
      )}

      {mode === "regenerate" && (
        <CodeDialog
          title="Get new backup codes?"
          message="Your current backup codes will stop working. Enter a code from your app to continue."
          confirmLabel="Get new codes"
          isLoading={twoFactor.regenerate.isPending}
          serverError={twoFactor.regenerate.isError ? dialogError(twoFactor.regenerate.error) : null}
          onCancel={() => {
            twoFactor.regenerate.reset();
            setMode("idle");
          }}
          onConfirm={async ({ totpCode }) => {
            try {
              setNewCodes(await twoFactor.regenerate.mutateAsync(totpCode));
              setMode("idle");
            } catch {
              // shown in the dialog
            }
          }}
        />
      )}
      {mode === "disable" && (
        <CodeDialog
          title="Turn off two-factor sign-in?"
          message="Signing in will only need your password again, and your backup codes will stop working."
          askPassword
          tone="danger"
          confirmLabel="Turn off"
          isLoading={twoFactor.disable.isPending}
          serverError={twoFactor.disable.isError ? dialogError(twoFactor.disable.error) : null}
          onCancel={() => {
            twoFactor.disable.reset();
            setMode("idle");
          }}
          onConfirm={async (v) => {
            try {
              await twoFactor.disable.mutateAsync(v);
              setMode("idle");
              onNotice("Two-factor sign-in is off.");
            } catch {
              // shown in the dialog
            }
          }}
        />
      )}
    </div>
  );
}