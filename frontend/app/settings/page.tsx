"use client";

import { useState } from "react";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { mockSystemSettings, updateSystemSettings } from "@/services/mock/system-settings";

export default function SettingsPage() {
  const { member, isLoading } = useCurrentMember();
  const [settings, setSettings] = useState(mockSystemSettings);
  const [saved, setSaved] = useState(false);

  if (isLoading) return null;
  if (!member || member.role !== "ADMINISTRATOR") {
    return (
      <div className="p-8">
        <p className="text-[var(--sevs-text-muted)]">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateSystemSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <>
      <Topbar title="Settings" subtitle="System configuration and governance policy" />

      <form onSubmit={handleSave} className="max-w-2xl space-y-6 p-4 pb-28 sm:p-8 sm:pb-8">
        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">
            Distributed Administration Trust (DAT)
          </h3>
          <label className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]">Required Approvals per Request</label>
          <input
            type="number"
            min={1}
            max={5}
            value={settings.datApprovalsRequired}
            onChange={(e) => setSettings((s) => ({ ...s, datApprovalsRequired: Number(e.target.value) }))}
            className="w-32 rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-[var(--sevs-text-muted)]">
            Display value only in this prototype — the approval workflow is currently fixed at two stages (Election Officer → Administrator).
          </p>

          <label className="mt-4 flex items-start gap-3 text-sm text-[var(--sevs-text-body)]">
            <input
              type="checkbox"
              checked={settings.allowEarlyClosureRequests}
              onChange={(e) => setSettings((s) => ({ ...s, allowEarlyClosureRequests: e.target.checked }))}
              className="mt-0.5 h-5 w-5 shrink-0"
            />
            Allow Election Officers to request early election closure
          </label>
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Authentication & Security</h3>
          <label className="flex items-start gap-3 text-sm text-[var(--sevs-text-body)]">
            <input
              type="checkbox"
              checked={settings.mfaRequiredForPrivilegedRoles}
              onChange={(e) => setSettings((s) => ({ ...s, mfaRequiredForPrivilegedRoles: e.target.checked }))}
              className="mt-0.5 h-5 w-5 shrink-0"
            />
            Require MFA/TOTP for Election Officer, Administrator, and Auditor accounts
          </label>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]">Access Token Expiry (minutes)</label>
              <input
                type="number"
                min={1}
                value={settings.accessTokenExpiryMinutes}
                onChange={(e) => setSettings((s) => ({ ...s, accessTokenExpiryMinutes: Number(e.target.value) }))}
                className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]">Refresh Token Expiry (days)</label>
              <input
                type="number"
                min={1}
                value={settings.refreshTokenExpiryDays}
                onChange={(e) => setSettings((s) => ({ ...s, refreshTokenExpiryDays: Number(e.target.value) }))}
                className="w-full rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--sevs-text-muted)]">
            Matches the JWT policy specified in the LLD (15-minute access tokens, 7-day rotating refresh tokens) — editable here for demonstration only.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">Membership Synchronization</h3>
          <label className="mb-1 block text-xs font-bold text-[var(--sevs-navy)]">Sync Frequency (hours)</label>
          <input
            type="number"
            min={1}
            value={settings.membershipSyncFrequencyHours}
            onChange={(e) => setSettings((s) => ({ ...s, membershipSyncFrequencyHours: Number(e.target.value) }))}
            className="w-32 rounded-lg border border-[var(--sevs-border)] px-3 py-2.5 text-sm focus:border-[var(--sevs-navy)] focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-[var(--sevs-text-muted)]">
            How often SEVS automatically pulls updated records from the external SACCO Membership System. Manual sync is still available on the Membership Synchronization page.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--sevs-border)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--sevs-text-muted)]">AI Governance Notifications</h3>
          <label className="flex items-start gap-3 text-sm text-[var(--sevs-text-body)]">
            <input
              type="checkbox"
              checked={settings.notifyOnHighRiskEvents}
              onChange={(e) => setSettings((s) => ({ ...s, notifyOnHighRiskEvents: e.target.checked }))}
              className="mt-0.5 h-5 w-5 shrink-0"
            />
            Notify Administrators when a high-risk anomaly is detected
          </label>
        </div>

        {/* Desktop/tablet: inline save (unchanged position) */}
        <div className="hidden sm:block">
          {saved && (
            <p className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              Settings saved (mock only — resets on refresh, no backend persistence yet).
            </p>
          )}
          <Button type="submit" className="sm:w-auto sm:px-8">
            Save Settings
          </Button>
        </div>

        {/* Mobile: sticky save bar, always within reach */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--sevs-border)] bg-white p-4 sm:hidden">
          {saved && (
            <p className="mb-3 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">
              Settings saved (mock only — resets on refresh, no backend persistence yet).
            </p>
          )}
          <Button type="submit" className="w-full">
            Save Settings
          </Button>
        </div>
      </form>
    </>
  );
}