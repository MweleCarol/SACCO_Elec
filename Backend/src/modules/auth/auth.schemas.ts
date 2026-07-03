import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "password is required"),
});

export const VerifyTotpLoginSchema = z.object({
  preAuthToken: z.string().min(1),
  code: z.string().length(6, "TOTP code must be 6 digits"),
});

export const EnrollTotpConfirmSchema = z.object({
  code: z.string().length(6, "TOTP code must be 6 digits"),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
});