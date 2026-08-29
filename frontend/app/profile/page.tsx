"use client";

import { useState } from "react";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { Topbar } from "@/components/layout/Topbar";
import { FormField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/button";
import { formatRoleLabel } from "@/lib/format";

export default function ProfilePage() {
  const { member, isLoading } = useCurrentMember();
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");

  if (isLoading) return null;

  if (!member) {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">
          You&apos;re not signed in.{" "}
          <a href="/login" className="font-bold text-[var(--sevs-navy)] hover:underline">
            Log in
          </a>{" "}
          to view your profile.
        </p>
      </div>
    );
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Mock only — no backend endpoint exists yet to persist profile edits.
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <>
      <Topbar title="Profile" subtitle="Your account details" />

      <div className="max-w-xl space-y-6 p-8">
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sevs-navy)] text-lg font-extrabold text-white">
              {member.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <div>
              <p className="font-bold text-[var(--sevs-navy)]">{member.name}</p>
              <p className="text-sm text-[var(--sevs-text-muted)]">{formatRoleLabel(member.role)}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase text-[var(--sevs-text-muted)]">Membership No.</dt>
              <dd className="mt-1 text-[var(--sevs-text-body)]">{member.membershipNumber ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[var(--sevs-text-muted)]">Branch</dt>
              <dd className="mt-1 text-[var(--sevs-text-body)]">{member.branch}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[var(--sevs-text-muted)]">MFA</dt>
              <dd className="mt-1 text-[var(--sevs-text-body)]">{member.mfaEnabled ? "Enabled" : "Disabled"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-[var(--sevs-text-muted)]">Member Since</dt>
              <dd className="mt-1 text-[var(--sevs-text-body)]">
                {new Date(member.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              </dd>
            </div>
          </dl>
        </div>

        <form onSubmit={handleSave} className="rounded-2xl border border-[var(--sevs-border)] bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
            Edit Details
          </h3>
          <FormField label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
          <FormField label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          {saved && (
            <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              Changes saved (mock only — not yet connected to a backend).
            </p>
          )}

          <Button type="submit">Save Changes</Button>
        </form>
      </div>
    </>
  );
}