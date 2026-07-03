import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "password is required"),
});

export const VerifyTotpLoginSchema = z.object({
  preAuthToken: z.string().min(1),
  code: z.string().length(6, "TOTP code must be 6 digits"),
});

export const EnrollTotpSchema = z.object({
  // Required only when the account already has TOTP enabled — proves the
  // caller still controls the existing factor before we replace it.
  currentCode: z.string().length(6).optional(),
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