"use client";

/* eslint-disable @next/next/no-img-element -- the QR code is a data: URL from our own API */
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Copy } from "lucide-react";
import { useTwoFactor } from "@/hooks/useProfile";
import { getApiErrorMessage, getApiFieldErrors } from "@/services/api/errors";
import { BackupCodesPanel } from "@/components/account/BackupCodesPanel";
import { LoadingCards } from "@/components/ui/LoadState";

// Two steps: (1) scan the QR code, or type the key, and confirm one code;
// (2) save the backup codes. Focus moves to each step's heading.
export function TwoFactorSetup({
  onCancel, onDone, cancelLabel = "Cancel", finishLabel,
}: { onCancel: () => void; onDone: (message: string) => void; cancelLabel?: string; finishLabel?: string }) {
  const twoFactor = useTwoFactor();
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const ids = { code: useId(), err: useId(), key: useId() };
  const start = twoFactor.start;
  const startSetup = start.mutate;

  // Ask the server for a new secret when the panel opens. If this runs twice
  // (React dev mode), the server keeps the latest secret, which is the one shown.
  useEffect(() => {
    startSetup();
  }, [startSetup]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [backupCodes]);

  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) {
      setCodeError("Enter the 6-digit code shown in the app.");
      document.getElementById(ids.code)?.focus();
      return;
    }
    try {
      setBackupCodes(await twoFactor.confirm.mutateAsync(code.trim()));
    } catch (err) {
      setCodeError(getApiFieldErrors(err)[0]?.message ?? getApiErrorMessage(err));
      document.getElementById(ids.code)?.focus();
    }
  }

  if (backupCodes) {
    return (
      <div className="mt-4 rounded-xl border border-[var(--sevs-border)] p-4">
        <h3 ref={headingRef} tabIndex={-1} className="mb-2 font-bold text-[var(--sevs-navy)] outline-none">
          Step 2 of 2: save your backup codes
        </h3>
        <BackupCodesPanel codes={backupCodes} finishLabel={finishLabel} onFinish={() => onDone("Two-factor sign-in is on. You'll be asked for a code when you sign in.")} />
      </div>
    );
  }

  const key = start.data?.totpSecret.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="mt-4 rounded-xl border border-[var(--sevs-border)] p-4">
      <h3 ref={headingRef} tabIndex={-1} className="mb-1 font-bold text-[var(--sevs-navy)] outline-none">
        Step 1 of 2: connect your phone
      </h3>
      <p className="mb-3 text-sm text-[var(--sevs-text-body)]">
        Install an authenticator app such as Google Authenticator, Microsoft Authenticator or Authy. In the app, add an
        account and scan this code.
      </p>
      {start.isPending && <LoadingCards count={1} label="Preparing your code…" />}
      {start.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{getApiErrorMessage(start.error)}</p>
      )}
      {start.data && (
        <form onSubmit={confirm} noValidate className="space-y-3">
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <img
              src={start.data.qrCodeDataUrl}
              alt="QR code to scan with your authenticator app"
              width={160}
              height={160}
              className="rounded-lg border border-[var(--sevs-border)] bg-white p-2"
            />
            <div className="min-w-0 text-sm">
              <p id={ids.key} className="text-[var(--sevs-text-muted)]">Can&apos;t scan? Type this key in the app instead:</p>
              <p aria-describedby={ids.key} className="mt-1 break-all font-mono text-base font-bold tracking-wider text-[var(--sevs-navy)]">
                {key}
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(start.data.totpSecret);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--sevs-border)] px-3 py-1.5 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50"
              >
                <Copy className="h-4 w-4" aria-hidden="true" /> {copied ? "Key copied" : "Copy key"}
              </button>
              <span aria-live="polite" className="sr-only">{copied ? "Key copied" : ""}</span>
            </div>
          </div>
          <div>
            <label htmlFor={ids.code} className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]">
              6-digit code from the app
            </label>
            <input
              id={ids.code}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setCodeError(null);
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              aria-invalid={codeError ? true : undefined}
              aria-describedby={codeError ? ids.err : undefined}
              className="w-40 rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-center font-mono text-lg tracking-[0.3em] focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20 aria-[invalid=true]:border-red-500"
            />
            {codeError && <p id={ids.err} role="alert" className="mt-1 text-sm text-red-700">{codeError}</p>}
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={twoFactor.confirm.isPending} className="rounded-lg bg-[var(--sevs-navy)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)] disabled:opacity-50">
              {twoFactor.confirm.isPending ? "Checking…" : "Confirm"}
            </button>
            <button type="button" onClick={onCancel} className="rounded-lg border border-[var(--sevs-border)] px-4 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50">
              {cancelLabel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}