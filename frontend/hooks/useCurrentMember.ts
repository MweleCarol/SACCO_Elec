"use client";

import { useEffect, useState } from "react";
import { getCurrentMemberId, onSessionChange } from "@/lib/session";
import { getMemberById } from "@/services/mock/members";
import type { Member } from "@/types/member";

interface CurrentMemberState {
  member: Member | null;
  isLoading: boolean;
}

function readMember(): CurrentMemberState {
  const id = getCurrentMemberId();
  return { member: id ? (getMemberById(id) ?? null) : null, isLoading: false };
}

export function useCurrentMember(): CurrentMemberState {
  const [state, setState] = useState<CurrentMemberState>({
    member: null,
    isLoading: true,
  });

  useEffect(() => {
    setState(readMember());
    return onSessionChange(() => setState(readMember()));
  }, []);

  return state;
}
