import { api, refreshAccessToken, setAccessToken } from "@/services/api/axios";
import type { ApiSuccess, LoginResponse, LoginSuccess, User } from "@/types/api";
import { isMfaChallenge } from "@/types/api";

// Calls to the /auth and /users/me endpoints (API_CONTRACT.md section 2).
// skipAuthRefresh: a 401 from these endpoints is a real answer (wrong password,
// expired MFA challenge), not an expired session to renew.

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<ApiSuccess<LoginResponse>>("/auth/login", { email, password }, { skipAuthRefresh: true });
  const data = res.data.data;
  if (!isMfaChallenge(data)) setAccessToken(data.accessToken);
  return data;
}

// The second step: the 6-digit app code, or a one-time backup code.
export async function verifyMfa(
  mfaChallengeToken: string,
  code: string,
  kind: "totp" | "backup" = "totp"
): Promise<LoginSuccess> {
  const body = kind === "backup" ? { mfaChallengeToken, backupCode: code } : { mfaChallengeToken, totpCode: code };
  const res = await api.post<ApiSuccess<LoginSuccess>>("/auth/verify-mfa", body, { skipAuthRefresh: true });
  setAccessToken(res.data.data.accessToken);
  return res.data.data;
}

export async function register(input: {
  membershipNumber: string; fullName: string; email: string; password: string; confirmPassword: string;
}): Promise<User> {
  const res = await api.post<ApiSuccess<User>>("/auth/register", input, { skipAuthRefresh: true });
  return res.data.data;
}

export async function getMe(): Promise<User> {
  const res = await api.get<ApiSuccess<User>>("/users/me");
  return res.data.data;
}

// On page load: use the refresh cookie (if any) to start a session again.
export async function restoreSession(): Promise<User | null> {
  const token = await refreshAccessToken();
  if (!token) return null;
  try {
    return await getMe();
  } catch {
    setAccessToken(null);
    return null;
  }
}

// Logout needs a valid access token. If it has expired (after 15 idle minutes)
// the normal refresh-and-retry runs first, so the server really revokes the
// refresh cookie. Otherwise the user would be logged straight back in on
// their next visit.
export async function logout(): Promise<void> {
  try {
    // Send {} (not null): the backend JSON parser rejects a literal null body with 400.
    await api.post("/auth/logout", {});
  } catch {
    // Nothing more we can do; the local session is cleared below regardless.
  } finally {
    // Forget the token even if the server could not be reached.
    setAccessToken(null);
  }
}