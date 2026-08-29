"use client";

// This file contains functions to manage the session cookie (small piece of data that a 
// website stores in your browser to remember you while you move around the website during one visit/session.) for the current user.
export function getCurrentMemberId(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )sevs_uid=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function clearSession(): void {
  document.cookie = "sevs_uid=; path=/; max-age=0";
}