import { z } from 'zod';
import { emailSchema, passwordSchema, otpCodeSchema } from '@shared/validators/common.validators';

// ---------------------------------------------------------------------
// Activation
// ---------------------------------------------------------------------

export const activationInitiateSchema = z.object({
  membershipNumber: z.string().trim().min(1, 'Membership number is required'),
  email: emailSchema,
});

export const activationVerifySchema = z.object({
  membershipNumber: z.string().trim().min(1),
  otp: otpCodeSchema,
  password: passwordSchema,
});

// ---------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or membership number is required'),
  password: z.string().min(1, 'Password is required'),
});

export const totpLoginSchema = z.object({
  mfaToken: z.string().min(1),
  code: otpCodeSchema,
});

// ---------------------------------------------------------------------
// Session lifecycle
// ---------------------------------------------------------------------

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

// ---------------------------------------------------------------------
// TOTP enrollment
// ---------------------------------------------------------------------

export const totpConfirmSchema = z.object({
  code: otpCodeSchema,
});

// ---------------------------------------------------------------------
// Staff activation
// ---------------------------------------------------------------------

export const staffActivationInitiateSchema = z.object({
  email: emailSchema,
});

export const staffActivationVerifySchema = z.object({
  email: emailSchema,
  otp: otpCodeSchema,
  password: passwordSchema,
});