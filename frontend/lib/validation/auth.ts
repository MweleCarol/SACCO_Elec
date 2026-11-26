import { z } from "zod";

// These rules mirror the backend (backend/src/modules/auth/auth.schema.ts).
// Checking them here first gives the user instant feedback; the backend still
// checks again, because the browser can't be trusted.

// Shown under the password field on registration, so people know the rules
// before they type, not only after an error.
export const PASSWORD_RULES_HINT =
  "At least 8 characters, with an uppercase letter, a lowercase letter and a number.";

const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  // No strength rules at login: just require something, and let the server
  // answer. Showing rules here would hint at what valid passwords look like.
  password: z.string().min(1, "Password is required."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    membershipNumber: z
      .string()
      .trim()
      .min(1, "Membership number is required."),
    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .email("Enter a valid email address."),
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name as registered with the SACCO."),
    password: strongPassword,
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

// The 6-digit code from an authenticator app (MFA step after login).
export const mfaCodeSchema = z.object({
  totpCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

// A one-time backup code, as printed ("ABCD-EFGH"); case, spaces and the dash
// do not matter.
export const backupCodeSchema = z.object({
  backupCode: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9]{4}[- ]?[A-Za-z0-9]{4}$/,
      "Enter one backup code, like ABCD-EFGH.",
    ),
});

export type BackupCodeFormValues = z.infer<typeof backupCodeSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: strongPassword,
    confirmNewPassword: z.string().min(1, "Type the new password again."),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "Choose a password you have not used here before.",
    path: ["newPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export type MfaCodeFormValues = z.infer<typeof mfaCodeSchema>;
