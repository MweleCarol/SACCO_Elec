"use client";

import { useParams } from "next/navigation";
import { useCurrentMember } from "@/hooks/useCurrentMember";
import { MemberElectionDetail } from "@/components/voter/MemberElectionDetail";
import { StaffElectionDetail } from "@/components/staff/StaffElectionDetail";

// One election. Members get the read-only public view; officers,
// administrators and auditors get the staff view with every stage and
// candidate.
export default function ElectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { member, isLoading } = useCurrentMember();
  if (isLoading || !member) return null; // AppShell handles loading and redirects
  if (member.role === "MEMBER") return <MemberElectionDetail id={id} />;
  return <StaffElectionDetail id={id} role={member.role} />;
}