"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as accountService from "@/services/account.service";

const KEY = ["profile"] as const;

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: KEY,
    queryFn: accountService.getProfile,
    enabled,
  });
}

// Two-factor changes refresh the profile (on/off, codes left) everywhere.
export function useTwoFactor() {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
  return {
    start: useMutation({ mutationFn: accountService.startMfaSetup }),
    confirm: useMutation({
      mutationFn: accountService.confirmMfaSetup,
      onSuccess: refresh,
    }),
    regenerate: useMutation({
      mutationFn: accountService.regenerateBackupCodes,
      onSuccess: refresh,
    }),
    disable: useMutation({
      mutationFn: (v: { password: string; totpCode: string }) =>
        accountService.disableMfa(v.password, v.totpCode),
      onSuccess: refresh,
    }),
  };
}

export function useChangePassword() {
  return useMutation({ mutationFn: accountService.changePassword });
}
