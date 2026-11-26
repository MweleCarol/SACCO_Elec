"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { Profile } from "@/types/api";
import { useProfile } from "@/hooks/useProfile";
import { formatRoleLabel } from "@/lib/format";
import { getApiErrorMessage } from "@/services/api/errors";
import { Topbar } from "@/components/layout/Topbar";
import { ToneBadge } from "@/components/voter/ElectionStatusBadge";
import { ErrorPanel, LoadingCards } from "@/components/ui/LoadState";
import { TwoFactorSection } from "@/components/account/TwoFactorSection";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";

const MEMBERSHIP: Record<
  NonNullable<Profile["membershipStatus"]>,
  { label: string; tone: "green" | "gray" | "amber" | "red" }
> = {
  ACTIVE: { label: "Active", tone: "green" },
  INACTIVE: { label: "Inactive", tone: "gray" },
  SUSPENDED: { label: "Suspended", tone: "amber" },
  EXITED: { label: "Exited", tone: "red" },
};

// The signed-in person's own account, on real data. Details come from the
// SACCO's records, so they are read-only here; security settings are below.
export default function ProfilePage() {
  const profile = useProfile();
  const [notice, setNotice] = useState<string | null>(null);

  if (profile.isLoading) {
    return (
      <>
        <Topbar title="Profile" subtitle="Your account" />
        <div className="p-4 sm:p-8">
          <LoadingCards count={2} label="Loading your profile…" />
        </div>
      </>
    );
  }
  if (profile.isError || !profile.data) {
    return (
      <>
        <Topbar title="Profile" subtitle="Your account" />
        <div className="p-4 sm:p-8">
          <ErrorPanel
            message={getApiErrorMessage(profile.error)}
            onRetry={() => profile.refetch()}
          />
        </div>
      </>
    );
  }

  const p = profile.data;
  const isMember = p.role === "MEMBER";
  const initials = p.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const details: { label: string; value: React.ReactNode }[] = [
    ...(isMember
      ? [{ label: "Membership number", value: p.membershipNumber ?? "—" }]
      : []),
    { label: "Email", value: p.email },
    { label: "Phone", value: p.phoneNumber ?? "—" },
    ...(isMember ? [{ label: "Branch", value: p.branch ?? "—" }] : []),
    ...(isMember && p.membershipStatus
      ? [
          {
            label: "SACCO membership",
            value: <ToneBadge {...MEMBERSHIP[p.membershipStatus]} />,
          },
        ]
      : []),
    {
      label: isMember ? "Member of SEVS since" : "Account created",
      value: new Date(p.memberSince).toLocaleDateString("en-KE", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
  ];

  return (
    <>
      <Topbar title="Profile" subtitle="Your account" />
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
        <div aria-live="polite">
          {notice && (
            <p className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0"
                aria-hidden="true"
              />
              {notice}
            </p>
          )}
        </div>

        <section
          aria-labelledby="details-heading"
          className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--sevs-navy)] text-lg font-extrabold text-white"
            >
              {initials}
            </span>
            <div className="min-w-0">
              <h2
                id="details-heading"
                className="break-words text-lg font-bold text-[var(--sevs-navy)]"
              >
                {p.fullName}
              </h2>
              <p className="text-sm text-[var(--sevs-text-muted)]">
                {formatRoleLabel(p.role)}
              </p>
            </div>
          </div>
          <dl className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {details.map((d) => (
              <div key={d.label} className="min-w-0">
                <dt className="text-[var(--sevs-text-muted)]">{d.label}</dt>
                <dd className="mt-0.5 break-words font-medium text-[var(--sevs-text-body)]">
                  {d.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-xs text-[var(--sevs-text-muted)]">
            {isMember
              ? "These details come from the SACCO's membership records. To change them, contact the SACCO office."
              : "To change these details, ask a SEVS administrator."}
          </p>
        </section>

        <section
          aria-labelledby="security-heading"
          className="space-y-4 rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6"
        >
          <h2
            id="security-heading"
            className="text-lg font-bold text-[var(--sevs-navy)]"
          >
            Security
          </h2>
          <TwoFactorSection profile={p} onNotice={setNotice} />
          <ChangePasswordForm />
        </section>
      </div>
    </>
  );
}
