import { Request, Response } from "express";
import { sendSuccess } from "../../shared/responses/ApiResponse";
import * as authService from "./auth.service";
import { RegisterInput, LoginInput, VerifyMfaInput, MfaConfirmInput, ChangePasswordInput } from "./auth.schema";
import { env, isProduction } from "../../config/env";
import { AuthError } from "../../shared/errors/AuthError";

const REFRESH_COOKIE_NAME = "refreshToken";

// Centralizes cookie flags in one place — httpOnly (JS on the frontend can
// never read it, closing off the main XSS exfiltration path), secure in
// production only (plain HTTP in local dev has no TLS to require),
// sameSite lax as a reasonable default for a same-site frontend/backend
// pair; revisit to "none" + secure if the deployed frontend ever lives on
// a genuinely different origin than what CORS_ORIGIN assumes.
function setRefreshCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    expires: expiresAt,
    path: "/api/v1/auth",
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/v1/auth" });
}

export async function register(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as RegisterInput;
  const user = await authService.register(body);
  sendSuccess(res, user, "Registration successful. You can now log in.", 201);
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as LoginInput;
  const { result, rawRefreshToken } = await authService.login(body, req.ip);

  if ("mfaRequired" in result) {
    sendSuccess(res, result, "MFA verification required.");
    return;
  }

  if (rawRefreshToken) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // matches JWT_REFRESH_EXPIRES_IN default; real value lives server-side on the token row itself
    setRefreshCookie(res, rawRefreshToken, expiresAt);
  }

  sendSuccess(res, result, "Login successful.");
}

export async function verifyMfa(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as VerifyMfaInput;
  const { session, rawRefreshToken } = await authService.verifyMfa(body, req.ip);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  setRefreshCookie(res, rawRefreshToken, expiresAt);

  sendSuccess(res, session, "Login successful.");
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!rawRefreshToken) {
    throw new AuthError("No active session found.");
  }

  const { accessToken, newRawRefreshToken } = await authService.refresh(rawRefreshToken, req.ip);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  setRefreshCookie(res, newRawRefreshToken, expiresAt);

  sendSuccess(res, { accessToken }, "Token refreshed.");
}

export async function logout(req: Request, res: Response): Promise<void> {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logout(rawRefreshToken, req.user?.id);
  clearRefreshCookie(res);
  sendSuccess(res, null, "Logged out.");
}

export async function me(req: Request, res: Response): Promise<void> {
  // req.user is guaranteed present here — this route is always mounted
  // behind `authenticate` in auth.routes.ts.
  sendSuccess(res, req.user, "Current session.");
}

export async function enrollMfa(req: Request, res: Response): Promise<void> {
  const result = await authService.enrollMfa(req.user!.id);
  sendSuccess(res, result, "Scan this QR code with your authenticator app, then confirm with a code.");
}

export async function confirmMfa(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as MfaConfirmInput;
  await authService.confirmMfaEnrollment(req.user!.id, body.totpCode);
  sendSuccess(res, null, "MFA enabled successfully.");
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as ChangePasswordInput;
  await authService.changePassword(req.user!.id, body);
  sendSuccess(res, null, "Password changed. Please log in again on other devices.");
}