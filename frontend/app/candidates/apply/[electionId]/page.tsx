
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { getElectionById, isAcceptingNominations } from "@/services/mock/elections";
import { submitCandidateApplication, hasAppliedForElection } from "@/services/mock/candidates";

export default function CandidateApplicationPage() {
  const { electionId } = useParams<{ electionId: string }>();
  const router = useRouter();
  const { member, isLoading } = useCurrentMember();
  const [positionId, setPositionId] = useState("");
  const [bio, setBio] = useState("");
  const [eligibilityConfirmed, setEligibilityConfirmed] = useState(false);
  const [declarationConfirmed, setDeclarationConfirmed] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return null;
  if (!member) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">
          You&apos;re not signed in.{" "}
          <a href="/login" className="font-bold text-[var(--sevs-navy)] hover:underline">Log in</a> to apply.
        </p>
      </div>
    );
  }

  const election = getElectionById(electionId);
  if (!election) {
    return <div className="p-8"><p className="text-[var(--sevs-text-muted)]">Election not found.</p></div>;
  }

  if (!isAcceptingNominations(election)) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">This election is not currently accepting candidate applications.</p>
      </div>
    );
  }

  if (hasAppliedForElection(member.id, election.id)) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">
          You&apos;ve already applied for this election.{" "}
          <a href="/my-candidacy" className="font-bold text-[var(--sevs-navy)] hover:underline">View your application</a>.
        </p>
      </div>
    );
  }

  const canSubmit = positionId && bio.trim() && eligibilityConfirmed && declarationConfirmed;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setSelectedFile(file ?? null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!member || !canSubmit) return;
    setSubmitting(true);
    submitCandidateApplication({
      memberId: member.id,
      memberName: member.name,
      membershipNumber: member.membershipNumber ?? "—",
      electionId: election.id,
      positionId,
      bio,
      eligibilityConfirmed,
      declarationConfirmed,
      documentUrl: selectedFile?.name, // filename only — no real file storage exists yet
    });
    setTimeout(() => router.push("/my-candidacy"), 400);
  }

  return (
    <>
      <Topbar title="Candidate Application" subtitle={election.title} />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 p-4 sm:p-8">
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Personal Information</h3>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-xs uppercase text-[var(--sevs-text-muted)]">Name</dt><dd className="mt-1 font-medium text-[var(--sevs-text-body)]">{member.name}</dd></div>
            <div><dt className="text-xs uppercase text-[var(--sevs-text-muted)]">Membership No.</dt><dd className="mt-1 font-medium text-[var(--sevs-text-body)]">{member.membershipNumber ?? "—"}</dd></div>
          </dl>
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Position</h3>
          <select
            value={positionId}
            onChange={(e) => setPositionId(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none"
          >
            <option value="">Select a position...</option>
            {election.positions.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>

          <label className="mb-1 mt-4 block text-xs font-bold text-[var(--sevs-navy)]">Candidate Statement</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            required
            placeholder="Briefly describe your background and why you're standing for this position..."
            className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none"
          />
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Supporting Documents</h3>

          <label
            htmlFor="candidate-document"
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--sevs-border)] px-4 py-6 text-sm text-[var(--sevs-text-muted)] hover:border-[var(--sevs-navy)] hover:text-[var(--sevs-navy)]"
          >
            <Upload className="h-4 w-4" />
            {selectedFile ? "Choose a different file" : "Click to select a document"}
          </label>
          <input
            id="candidate-document"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-[var(--sevs-bg)] px-3 py-2 text-sm">
              <span className="truncate text-[var(--sevs-text-body)]">{selectedFile.name}</span>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="ml-2 shrink-0 text-xs font-bold text-red-600"
              >
                Remove
              </button>
            </div>
          )}

          <p className="mt-2 text-xs text-[var(--sevs-text-muted)]">
            Accepted formats: PDF, JPG, PNG. This file stays in your browser only — there&apos;s no real upload/storage backend yet, so it won&apos;t persist after you leave this page.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Eligibility & Declaration</h3>
          <label className="flex items-start gap-3 py-2 text-sm text-[var(--sevs-text-body)]">
            <input type="checkbox" checked={eligibilityConfirmed} onChange={(e) => setEligibilityConfirmed(e.target.checked)} className="mt-1 h-4 w-4" />
            I confirm that I meet the SACCO&apos;s membership requirements and election rules for this position.
          </label>
          <label className="flex items-start gap-3 py-2 text-sm text-[var(--sevs-text-body)]">
            <input type="checkbox" checked={declarationConfirmed} onChange={(e) => setDeclarationConfirmed(e.target.checked)} className="mt-1 h-4 w-4" />
            I declare that the information provided in this application is accurate to the best of my knowledge.
          </label>
        </div>

        <p className="text-xs text-[var(--sevs-text-muted)]">
          Submitting this application does not guarantee candidacy. An Election Officer will verify your eligibility against SACCO requirements, and an independent Administrator must co-approve before you appear on the ballot.
        </p>

        <Button type="submit" disabled={!canSubmit} isLoading={submitting} className="w-full sm:w-auto sm:px-8">
          Submit Application
        </Button>
      </form>
    </>
  );
}