"use client";

import { useEffect, useState } from "react";
import { getCurrentMemberId } from "@/lib/session";
import { getMemberById } from "@/services/mock/members";
import type { Member } from "@/types/member";

// State interface for the useCurrentMember hook, which includes the current member's information and a loading state.
interface CurrentMemberState {
  member: Member | null;
  isLoading: boolean;
}

// Custom hook to fetch the current member's information based on the session ID. 
// It returns the member data and a loading state.
export function useCurrentMember(): CurrentMemberState {
  const [state, setState] = useState<CurrentMemberState>({ member: null, isLoading: true });

  useEffect(() => {
    const id = getCurrentMemberId();
    setState({ member: id ? getMemberById(id) ?? null : null, isLoading: false });
  }, []);

  return state;
}