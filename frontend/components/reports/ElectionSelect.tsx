import { mockElections } from "@/services/mock/elections";

interface ElectionSelectProps {
  value: string;
  onChange: (id: string) => void;
}

export function ElectionSelect({ value, onChange }: ElectionSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm font-medium text-[var(--sevs-navy)] focus:border-[var(--sevs-navy)] focus:outline-none sm:w-auto"
    >
      {mockElections.map((e) => (
        <option key={e.id} value={e.id}>{e.title}</option>
      ))}
    </select>
  );
}