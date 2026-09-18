import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function OfficerResultsPanel({ electionId }: { electionId: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          <p className="text-sm font-bold">Results are verified and ready for publication.</p>
        </div>
      </div>
      <Link
        href={`/reports?election=${electionId}`}
        className="block rounded-lg border border-[var(--sevs-border)] bg-white px-4 py-2.5 text-center text-sm font-bold text-[var(--sevs-navy)] hover:bg-[var(--sevs-bg)]"
      >
        View Audit Trail
      </Link>
    </div>
  );
}