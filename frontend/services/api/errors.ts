import { isAxiosError } from "axios";
import type { ApiFailure, ApiFieldError } from "@/types/api";

// The backend's `message` is always written to be shown to the user, so use it
// when there is one. Otherwise fall back to a plain explanation.
export function getApiErrorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (isAxiosError<ApiFailure>(err)) {
    if (!err.response) return "Cannot reach the SEVS server. Check your internet connection and try again.";
    return err.response.data?.message ?? fallback;
  }
  return fallback;
}

// Field-level messages from a 422 response, to show next to each form field.
export function getApiFieldErrors(err: unknown): ApiFieldError[] {
  if (isAxiosError<ApiFailure>(err) && err.response?.status === 422) {
    return err.response.data?.errors ?? [];
  }
  return [];
}

export function getApiStatus(err: unknown): number | undefined {
  return isAxiosError(err) ? err.response?.status : undefined;
}