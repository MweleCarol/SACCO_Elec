"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

type Candidate = { id: string; name: string; slogan: string };
type Position = { id: string; title: string; candidates: Candidate[] };

// Mock — replace with a fetch of this election's ballot from the API.
const ELECTION = {
  id: "el-2026-agm",
  title: "2026 Annual Board Elections",
  closesAt: "24 Jul 2026, 5:00 PM",
  positions: [
    {
      id: "chair",
      title: "Chairperson",
      candidates: [
        { id: "c1", name: "Grace Njeri", slogan: "Transparent governance, stronger dividends." },
        { id: "c2", name: "Peter Otieno", slogan: "Digitising every member service." },
        { id: "c3", name: "Mary Wambui", slogan: "Growth without losing the co-operative spirit." },
      ],
    },
    {
      id: "treasurer",
      title: "Treasurer",
      candidates: [
        { id: "c4", name: "Samuel Kiptoo", slogan: "Prudent lending, protected savings." },
        { id: "c5", name: "Alice Chebet", slogan: "Clear books, quarterly member reports." },
      ],
    },
    {
      id: "secretary",
      title: "Secretary",
      candidates: [
        { id: "c6", name: "David Mutua", slogan: "Faster AGM communication for all branches." },
        { id: "c7", name: "Faith Achieng", slogan: "Every member's voice, properly recorded." },
      ],
    },
  ] as Position[],
};

type Step = "ballot" | "review" | "success";

export default function ElectionBallotPage() {
  const router = useRouter();
  const params = useParams<{ electionId: string }>();

  const [step, setStep] = React.useState<Step>("ballot");
  const [selections, setSelections] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [receiptCode] = React.useState(
    () => `SEVS-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-5)}`
  );

  const allPositionsFilled = ELECTION.positions.every((p) => selections[p.id]);

  const selectCandidate = (positionId: string, candidateId: string) => {
    setSelections((prev) => ({ ...prev, [positionId]: candidateId }));
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    // TODO: wire up to the ballot-submission API (with TOTP re-verification).
    await new Promise((resolve) => setTimeout(resolve, 1400));
    setSubmitting(false);
    setStep("success");
  };

  if (step === "success") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Your vote has been recorded</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Keep this receipt code to verify your ballot was counted, without revealing your choices.
        </p>
        <div className="mt-5 w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-700">
          {receiptCode}
        </div>
        <button
          onClick={() => router.push("/elections")}
          className="mt-6 w-full rounded-lg bg-[#0C1657] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0C1657]/90 sm:w-auto sm:px-8"
        >
          Back to elections
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={() => (step === "review" ? setStep("ballot") : router.push("/elections"))}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {step === "review" ? "Back to ballot" : "Back to elections"}
      </button>

      <div>
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{ELECTION.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {params?.electionId ?? ELECTION.id} · Closes {ELECTION.closesAt}
        </p>
      </div>

      {step === "ballot" && (
        <div className="flex flex-col gap-5">
          {ELECTION.positions.map((position) => (
            <fieldset key={position.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <legend className="px-1 text-sm font-semibold text-slate-900">{position.title}</legend>
              <p className="mb-3 mt-1 px-1 text-xs text-slate-500">Select one candidate for this seat.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {position.candidates.map((candidate) => {
                  const selected = selections[position.id] === candidate.id;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => selectCandidate(position.id, candidate.id)}
                      className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                        selected
                          ? "border-[#0C1657] bg-[#0C1657]/5 ring-1 ring-[#0C1657]"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          selected ? "bg-[#0C1657] text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {candidate.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{candidate.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{candidate.slogan}</p>
                      </div>
                      {selected && <Check className="ml-auto h-4 w-4 shrink-0 text-[#0C1657]" />}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <button
            type="button"
            disabled={!allPositionsFilled}
            onClick={() => setStep("review")}
            className="w-full rounded-lg bg-[#0C1657] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0C1657]/90 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:self-end sm:px-8"
          >
            Review my ballot
          </button>
        </div>
      )}

      {step === "review" && (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">Confirm your selections</h2>
              <p className="mt-1 text-xs text-slate-500">
                Your ballot is final once submitted and cannot be changed afterwards.
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {ELECTION.positions.map((position) => {
                const candidate = position.candidates.find((c) => c.id === selections[position.id]);
                return (
                  <li key={position.id} className="flex items-center justify-between px-5 py-4">
                    <span className="text-sm text-slate-500">{position.title}</span>
                    <span className="text-sm font-medium text-slate-900">{candidate?.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            You may be asked to confirm a one-time verification code before your ballot is recorded.
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirmSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0C1657] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0C1657]/90 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:self-end sm:px-8"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Submitting ballot…" : "Confirm & submit ballot"}
          </button>
        </div>
      )}
    </div>
  );
}