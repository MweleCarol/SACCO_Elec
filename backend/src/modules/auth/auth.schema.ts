import { z } from "zod";

// Registration is sync-bound (LLD §7 / Option 1 from our earlier
// discussion): the membershipNumber must already exist as a
// PENDING_ACTIVATION row created by membership-sync. This schema only
// validates shape — the "does this membership number actually exist and
// is it unclaimed" check is business logic, done in auth.service.ts,
// not here.
export const registerSchema = z
  .object({
    membershipNumber: z.string().trim().min(1, "Membership number is required."),
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
      .regex(/[0-9]/, "Password must contain at least one number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const verifyMfaSchema = z.object({
  mfaChallengeToken: z.string().min(1, "MFA challenge token is required."),
  totpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

export type VerifyMfaInput = z.infer<typeof verifyMfaSchema>;

// No body needed — the CLI/frontend sends the refresh token via the
// httpOnly cookie set on login (see API_CONTRACT.md's open question,
// resolved as: cookie transport). Kept as an empty schema rather than
// skipping validation entirely, so the validate middleware still runs
// consistently across every auth route.
export const refreshSchema = z.object({});

export const mfaConfirmSchema = z.object({
  totpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

export type MfaConfirmInput = z.infer<typeof mfaConfirmSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
      .regex(/[0-9]/, "Password must contain at least one number."),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;