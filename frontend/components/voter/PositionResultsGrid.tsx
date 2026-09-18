import { Briefcase, Wallet, FileText, Users, ClipboardList, Star } from "lucide-react";
import type { PositionResult } from "@/types/result";
import { PositionResultCard } from "@/components/voter/PositionResultCard";

const PALETTE = [
  { color: "#2563eb", bg: "bg-blue-50", icon: <Briefcase className="h-4 w-4" /> },
  { color: "#16a34a", bg: "bg-green-50", icon: <Wallet className="h-4 w-4" /> },
  { color: "#7c3aed", bg: "bg-violet-50", icon: <FileText className="h-4 w-4" /> },
  { color: "#db2777", bg: "bg-pink-50", icon: <Users className="h-4 w-4" /> },
  { color: "#0d9488", bg: "bg-teal-50", icon: <ClipboardList className="h-4 w-4" /> },
  { color: "#ea580c", bg: "bg-orange-50", icon: <Star className="h-4 w-4" /> },
];

export function PositionResultsGrid({ positions }: { positions: PositionResult[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {positions.map((result, i) => {
        const style = PALETTE[i % PALETTE.length];
        return (
          <PositionResultCard
            key={result.positionId}
            result={result}
            accentColor={style.color}
            accentBg={style.bg}
            icon={style.icon}
          />
        );
      })}
    </div>
  );
}