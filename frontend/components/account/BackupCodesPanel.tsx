"use client";

import { useId, useState } from "react";
import { Copy, Download } from "lucide-react";

// Shows a fresh set of backup codes, once. The person must say they saved
// them before continuing, because the codes can never be shown again.
export function BackupCodesPanel({ codes, onFinish, finishLabel = "Finish" }: { codes: string[]; onFinish: () => void; finishLabel?: string }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const ids = { saved: useId(), err: useId(), list: useId() };
  const text = `SEVS backup codes\nEach code works once. Keep them somewhere safe.\n\n${codes.join("\n")}\n`;

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "sevs-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function finish() {
    if (!saved) {
      setError(true);
      document.getElementById(ids.saved)?.focus();
      return;
    }
    onFinish();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--sevs-text-body)]">
        If you lose your phone, each of these codes lets you sign in once. They will not be shown again.
      </p>
      <ul
        id={ids.list}
        aria-label="Backup codes"
        className="grid grid-cols-2 gap-2 rounded-xl bg-[var(--sevs-bg)] p-4 font-mono text-sm text-[var(--sevs-navy)] sm:grid-cols-4"
      >
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={download} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50">
          <Download className="h-4 w-4" aria-hidden="true" /> Download
        </button>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm font-bold text-[var(--sevs-navy)] hover:bg-gray-50">
          <Copy className="h-4 w-4" aria-hidden="true" /> {copied ? "Copied" : "Copy"}
        </button>
        <span aria-live="polite" className="sr-only">{copied ? "Backup codes copied" : ""}</span>
      </div>
      <label className="flex items-start gap-2 text-sm text-[var(--sevs-text-body)]">
        <input
          id={ids.saved}
          type="checkbox"
          checked={saved}
          onChange={(e) => {
            setSaved(e.target.checked);
            setError(false);
          }}
          aria-invalid={error || undefined}
          aria-describedby={error ? ids.err : undefined}
          className="mt-0.5 h-4 w-4 accent-[var(--sevs-navy)]"
        />
        I have saved these codes somewhere safe (printed, written down, or in a password manager).
      </label>
      {error && <p id={ids.err} role="alert" className="text-sm text-red-700">Save the codes first, then tick the box.</p>}
      <button type="button" onClick={finish} className="rounded-lg bg-[var(--sevs-navy)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--sevs-navy-hover)]">
        {finishLabel}
      </button>
    </div>
  );
}