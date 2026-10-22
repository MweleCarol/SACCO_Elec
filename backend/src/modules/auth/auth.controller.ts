import { Request, Response } from "express";
import { sendSuccess } from "../../shared/responses/ApiResponse";
import * as authService from "./auth.service";
import { RegisterInput, LoginInput, VerifyMfaInput, MfaConfirmInput, ChangePasswordInput } from "./auth.schema";
import { env, isProduction } from "../../config/env";
import { AuthError } from "../../shared/errors/AuthError";
import { parseDurationMs } from "../../shared/utils/duration";

const REFRESH_COOKIE_NAME = "refreshToken";

// httpOnly keeps the token away from frontend JavaScript, secure applies in
// production only (local dev runs on plain HTTP), and the lifetime comes from
// the same env value the server uses when it stores the token.
function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
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
    setRefreshCookie(res, rawRefreshToken);
  }

  sendSuccess(res, result, "Login successful.");
}

export async function verifyMfa(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as VerifyMfaInput;
  const { session, rawRefreshToken } = await authService.verifyMfa(body, req.ip);

  setRefreshCookie(res, rawRefreshToken);

  sendSuccess(res, session, "Login successful.");
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!rawRefreshToken) {
    throw new AuthError("No active session found.");
  }

  const { accessToken, newRawRefreshToken } = await authService.refresh(rawRefreshToken, req.ip);

  setRefreshCookie(res, newRawRefreshToken);

  sendSuccess(res, { accessToken }, "Token refreshed.");
}

export async function logout(req: Request, res: Response): Promise<void> {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logout(rawRefreshToken, req.user?.id);
  clearRefreshCookie(res);
  sendSuccess(res, null, "Logged out.");
}

export async function me(req: Request, res: Response): Promise<void> {
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