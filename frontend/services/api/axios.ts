import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";
import type { ApiSuccess } from "@/types/api";

// One configured client for the whole app. See API_CONTRACT.md section 2.
//
// Access token: kept in this module's memory only (never localStorage, where
//   any injected script could read it). It is lost on page reload, so the app
//   gets a new one from the refresh cookie on startup (AuthContext).
// Refresh token: an httpOnly cookie the browser sends by itself because of
//   withCredentials. JavaScript never sees it.

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // send the refresh cookie
  headers: { "Content-Type": "application/json" },
  timeout: 20_000,
});

// ---------- Access token (memory only) ----------

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// AuthContext listens to this to send the user to the login page when the
// session cannot be renewed.
const sessionExpiredListeners = new Set<() => void>();

export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

// ---------- Refresh (one at a time) ----------

// Only ONE refresh may run at a time. The backend rotates the refresh token on
// every use and treats a second use of an old one as theft, logging the user
// out everywhere. So if several requests get a 401 together, or React runs
// the startup effect twice, they all wait for the same refresh.
let refreshInFlight: Promise<string | null> | null = null;

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = api
      .post<ApiSuccess<{ accessToken: string }>>("/auth/refresh", {}, { skipAuthRefresh: true })
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        return res.data.data.accessToken;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// ---------- Interceptors ----------

declare module "axios" {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean; // for auth endpoints: a 401 there is a real answer
    _retried?: boolean;
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig | undefined;
    const status = error.response?.status;

    if (status !== 401 || !original || original.skipAuthRefresh || original._retried) {
      return Promise.reject(error);
    }

    // Access token expired (they last 15 minutes): renew once, then retry.
    original._retried = true;
    const newToken = await refreshAccessToken();
    if (!newToken) {
      sessionExpiredListeners.forEach((listener) => listener());
      return Promise.reject(error);
    }
    return api(original);
  }
);