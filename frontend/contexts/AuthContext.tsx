"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authService from "@/services/auth.service";
import { onSessionExpired } from "@/services/api/axios";
import type { LoginResponse, User } from "@/types/api";

// Who is logged in, for the whole app.
//   "loading"       - checking the refresh cookie on startup
//   "authenticated" - user is set
//   "anonymous"     - nobody is logged in
type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<LoginResponse>;
  verifyMfa: (
    mfaChallengeToken: string,
    code: string,
    kind?: "totp" | "backup",
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Shared across React's double-run of effects in development, so startup only
// ever triggers one refresh request (a second one would look like token theft
// to the backend).
let restorePromise: Promise<User | null> | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    restorePromise ??= authService.restoreSession();
    let cancelled = false;
    restorePromise.then((restored) => {
      if (cancelled) return;
      setUser(restored);
      setStatus(restored ? "authenticated" : "anonymous");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A request found the session could not be renewed: treat as logged out.
  useEffect(
    () =>
      onSessionExpired(() => {
        restorePromise = null;
        setUser(null);
        setStatus("anonymous");
      }),
    [],
  );

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    if ("user" in result) {
      setUser(result.user);
      setStatus("authenticated");
    }
    return result; // the caller shows the MFA step when mfaRequired is true
  }, []);

  const verifyMfa = useCallback(
    async (
      mfaChallengeToken: string,
      code: string,
      kind: "totp" | "backup" = "totp",
    ) => {
      const result = await authService.verifyMfa(mfaChallengeToken, code, kind);
      setUser(result.user);
      setStatus("authenticated");
    },
    [],
  );

  const logout = useCallback(async () => {
    await authService.logout();
    restorePromise = null;
    setUser(null);
    setStatus("anonymous");
  }, []);

  const refreshUser = useCallback(async () => {
    setUser(await authService.getMe());
  }, []);

  const value = useMemo(
    () => ({ user, status, login, verifyMfa, logout, refreshUser }),
    [user, status, login, verifyMfa, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
