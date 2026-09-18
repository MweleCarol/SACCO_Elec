"use client";

const SESSION_EVENT = "sevs-session-changed";

export function getCurrentMemberId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )sevs_uid=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCurrentMemberId(id: string): void {
  document.cookie = `sevs_uid=${encodeURIComponent(id)}; path=/; max-age=86400`;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession(): void {
  document.cookie = "sevs_uid=; path=/; max-age=0";
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function onSessionChange(callback: () => void): () => void {
  window.addEventListener(SESSION_EVENT, callback);
  return () => window.removeEventListener(SESSION_EVENT, callback);
}
