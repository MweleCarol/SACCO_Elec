"use client";

import * as React from "react";
import { CheckCircle2, Copy, Check } from "lucide-react";

type HistoryEntry = {
  id: string;
  electionTitle: string;
  castAt: string;
  receiptCode: string;
  seats: number;
};

// Mock — replace with data fetched from the voting-history API.
const HISTORY: HistoryEntry[] = [
  {
    id: "h1",
    electionTitle: "2025 Annual Board Elections",
    castAt: "22 Jul 2025, 2:14 PM",
    receiptCode: "SEVS-7QK2-88213",
    seats: 3,
  },
  {
    id: "h2",
    electionTitle: "2024 Supervisory Committee By-Election",
    castAt: "9 Mar 2024, 11:02 AM",
    receiptCode: "SEVS-4TN0-51947",
    seats: 1,
  },
  {
    id: "h3",
    electionTitle: "2023 Annual Board Elections",
    castAt: "21 Jul 2023, 4:47 PM",
    receiptCode: "SEVS-9XR5-30862",
    seats: 3,
  },
];

function CopyReceiptButton({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access unavailable — nothing further to do here.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function VotingHistoryPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Voting history</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every ballot you&apos;ve cast, with a receipt code you can use to verify it was counted.
        </p>
      </div>

      {HISTORY.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
          <p className="text-sm text-slate-500">You haven&apos;t voted in any elections yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {HISTORY.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-sm font-medium text-slate-900">{entry.electionTitle}</p>
                  </div>
                  <p className="mt-1 pl-6 text-xs text-slate-500">
                    Voted {entry.castAt} · {entry.seats} seat{entry.seats > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3.5 py-2.5">
                <span className="truncate font-mono text-xs text-slate-600">{entry.receiptCode}</span>
                <CopyReceiptButton code={entry.receiptCode} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}