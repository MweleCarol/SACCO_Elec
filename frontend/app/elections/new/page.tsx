"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/button";
import { createMockElection } from "@/services/mock/elections";
import { Plus, X } from "lucide-react";

export default function NewElectionPage() {
  const { member, isLoading } = useCurrentMember();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [positions, setPositions] = useState([{ title: "", seats: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return null;
  if (!member || member.role !== "ELECTION_OFFICER") {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  function updatePosition(index: number, field: "title" | "seats", value: string) {
    setPositions((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: field === "seats" ? Number(value) || 1 : value } : p))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Mock only — real submission goes through validation, then DAT approval, per the election lifecycle.
    const election = createMockElection({
      title, description, startDate, endDate,
      positions: positions.filter((p) => p.title.trim()),
    });
    setTimeout(() => router.push(`/elections/${election.id}`), 400);
  }

  return (
    <>
      <Topbar title="New Election" subtitle="Draft — submit for approval once ready" />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 p-4 sm:p-8">
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <FormField label="Election Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <FormField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Start Date" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            <FormField label="End Date" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Positions</h3>
          {positions.map((pos, i) => (
            <div key={i} className="mb-3 flex gap-2">
              <input
                value={pos.title}
                onChange={(e) => updatePosition(i, "title", e.target.value)}
                placeholder="Position title"
                className="flex-1 rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none"
              />
              <input
                type="number"
                min={1}
                value={pos.seats}
                onChange={(e) => updatePosition(i, "seats", e.target.value)}
                className="w-20 rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none"
              />
              {positions.length > 1 && (
                <button type="button" onClick={() => setPositions((p) => p.filter((_, idx) => idx !== i))} className="text-gray-400">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPositions((p) => [...p, { title: "", seats: 1 }])}
            className="flex items-center gap-1.5 text-sm font-bold text-[var(--sevs-navy)]"
          >
            <Plus className="h-4 w-4" /> Add position
          </button>
        </div>

        <Button type="submit" isLoading={submitting} className="w-full sm:w-auto sm:px-8">
          Save as Draft
        </Button>
      </form>
    </>
  );
}