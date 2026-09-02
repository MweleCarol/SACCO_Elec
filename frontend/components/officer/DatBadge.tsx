import type { Approval } from "@/types/approval";

export function DatBadge({ approval }: { approval: Approval }) {
  const approvedCount = approval.stages.filter((s) => s.status === "APPROVED").length;
  if (approval.status === "REJECTED") {
    return <span className="text-xs font-bold text-red-600">Rejected</span>;
  }
  return (
    <span className="text-xs font-bold text-[var(--sevs-text-muted)]">
      DAT {approvedCount}/{approval.stages.length}
    </span>
  );
}