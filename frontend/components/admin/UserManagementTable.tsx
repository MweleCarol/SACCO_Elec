"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatRoleLabel } from "@/lib/format";
import { searchMembers } from "@/services/mock/members";
import type { UserRole, MemberStatus } from "@/types/member";

const ROLE_OPTIONS: { value: UserRole | ""; label: string }[] = [
  { value: "", label: "All Roles" },
  { value: "MEMBER", label: "Member" },
  { value: "ELECTION_OFFICER", label: "Election Officer" },
  { value: "ADMINISTRATOR", label: "Administrator" },
  { value: "AUDITOR", label: "Auditor" },
];

const STATUS_OPTIONS: { value: MemberStatus | ""; label: string }[] = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
];

export function UserManagementTable() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<MemberStatus | "">("");

  const results = searchMembers(query, role || undefined, status || undefined);

  return (
    <div className="rounded-2xl border border-[var(--sevs-border)] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[var(--sevs-border)] p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full rounded-lg border border-[var(--sevs-border)] py-2 pl-9 pr-3 text-sm focus:border-[var(--sevs-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--sevs-navy)]/20"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole | "")}
          className="rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as MemberStatus | "")}
          className="rounded-lg border border-[var(--sevs-border)] px-3 py-2 text-sm text-[var(--sevs-text-body)] focus:border-[var(--sevs-navy)] focus:outline-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* horizontal scroll on mobile instead of squeezing columns unreadably (HCI: avoid forced truncation of key data) */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--sevs-border)] text-xs uppercase tracking-wide text-[var(--sevs-text-muted)]">
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Role</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--sevs-border)]">
            {results.map((m) => (
              <tr key={m.id}>
                <td className="px-5 py-3">
                  <p className="font-medium text-[var(--sevs-navy)]">{m.name}</p>
                  <p className="text-xs text-[var(--sevs-text-muted)]">{m.email}</p>
                </td>
                <td className="px-5 py-3 text-[var(--sevs-text-body)]">{formatRoleLabel(m.role)}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={m.status ?? "ACTIVE"} />
                </td>
                <td className="px-5 py-3">
                  <Link href={`/users/${m.id}`} className="font-bold text-[var(--sevs-navy)] hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-sm text-[var(--sevs-text-muted)]">
                  No users match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}