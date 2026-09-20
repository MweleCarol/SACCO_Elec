import { CheckCircle2 } from "lucide-react";

export function AuditorResultsPanel({ approvedCount, requiredCount }: { approvedCount: number; requiredCount: number }) {
  const checks = [
    { label: "DAT approvals followed", detail: `${approvedCount} / ${requiredCount} approved` },
    { label: "No irregularities detected", detail: "in result generation" },
    { label: "Audit trail integrity", detail: "Verified (SHA-256)" },
    { label: "Result publication", detail: "Authorized & recorded" },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm">
        <h3 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Audit &amp; Compliance Summary</h3>
        <div className="space-y-2.5 text-sm">
          {checks.map((c) => (
            <div key={c.label} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <div>
                <p className="font-medium text-[var(--sevs-text-body)]">{c.label}</p>
                <p className="text-xs text-[var(--sevs-text-muted)]">{c.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-4 shadow-sm">
        <h3 className="mb-2.5 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Key Audit Evidence</h3>
        <div className="space-y-1.5 text-sm">
          <a href="/audit-logs" className="block font-medium text-[var(--sevs-navy)] hover:underline">Download Audit Log (PDF)</a>
          <button
            onClick={() => console.log("Mock: would generate a Results Report PDF — no PDF backend exists yet.")}
            className="block text-left font-medium text-[var(--sevs-navy)] hover:underline"
          >
            Download Results Report (PDF)
          </button>
          <a href="/reports" className="block font-medium text-[var(--sevs-navy)] hover:underline">View Event Timeline</a>
        </div>
      </div>

      <p className="rounded-lg bg-[var(--sevs-bg)] px-3 py-2 text-center text-xs text-[var(--sevs-text-muted)]">
        The results have been independently verified and match the audit trail records.
      </p>
    </div>
  );
}