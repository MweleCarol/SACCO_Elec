import { CheckCircle2 } from "lucide-react";

interface AdminResultsPanelProps {
  result: { verifiedAt?: string; verifiedBy?: string; publishedAt: string; publishedBy?: string };
  approvedCount: number;
  requiredCount: number;
}

export function AdminResultsPanel({ result, approvedCount, requiredCount }: AdminResultsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-(--sevs-border) bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-(--sevs-text-muted)">Governance &amp; Publication</h3>
        <div className="space-y-3 text-sm">
          {result.verifiedAt && (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <div>
                <p className="font-medium text-(--sevs-text-body)">Counting completed</p>
                <p className="text-xs text-(--sevs-text-muted)">{new Date(result.verifiedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
            <div>
              <p className="font-medium text-(--sevs-text-body)">DAT Approval (Result Publication)</p>
              <p className="text-xs text-(--sevs-text-muted)">{approvedCount} / {requiredCount} Approved</p>
            </div>
          </div>
          {result.publishedBy && (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <div>
                <p className="font-medium text-(--sevs-text-body)">Published by {result.publishedBy}</p>
                <p className="text-xs text-(--sevs-text-muted)">{new Date(result.publishedAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => console.log("Mock: would generate a Results PDF — no PDF backend exists yet.")}
        className="w-full rounded-lg bg-(--sevs-navy) px-4 py-2.5 text-sm font-bold text-white"
      >
        Download Final Report
      </button>
      
      <a
        href="/audit-logs"
        className="block w-full rounded-lg border border-(--sevs-border) bg-white px-4 py-2.5 text-center text-sm font-bold text-(--sevs-navy)"
      >
        View Audit Logs
      </a>
      <p className="text-center text-xs text-(--sevs-text-muted)">
        All actions are recorded and protected by the audit trail and SHA-256 chain.
      </p>
    </div>
  );
}