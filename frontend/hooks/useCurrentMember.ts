"use client";

import { useAuth } from "@/contexts/AuthContext";
import type { Member } from "@/types/member";
import type { User } from "@/types/api";

interface CurrentMemberState {
  member: Member | null;
  isLoading: boolean;
}

// Bridge for screens that still use the older Member shape. Identity now comes
// from the real login (AuthContext); each screen moves to useAuth() and the
// types in types/api.ts as it is connected to the API.
function toMember(user: User): Member {
  return {
    id: user.id,
    name: user.fullName,
    email: user.email,
    membershipNumber: user.membershipNumber ?? undefined,
    role: user.role,
    branch: "", // not returned by the API yet (see API_CONTRACT.md section 6)
    mfaEnabled: user.mfaEnabled,
    isOnline: true,
    avatarUrl: "",
    createdAt: "",
    status: user.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
  };
}

export function useCurrentMember(): CurrentMemberState {
  const { user, status } = useAuth();
  return { member: user ? toMember(user) : null, isLoading: status === "loading" };
}