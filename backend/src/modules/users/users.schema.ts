import { z } from "zod";

// What a MEMBER can change about their own account. Deliberately does NOT
// include membershipNumber, nationalId, branch, membershipStatus, or
// fullName — those are synced fields per LLD §7. Email is here because,
// unlike the other fields, contact info is explicitly "permitted contact
// information" the LLD allows members to update themselves.
export const updateOwnProfileSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").optional(),
  phoneNumber: z.string().trim().min(7, "Enter a valid phone number.").optional(),
});

export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;

// What an ELECTION_ADMINISTRATOR can change about any account — a
// superset that also allows role/status changes, which no member should
// ever be able to do to themselves (that's enforced by which route this
// schema is attached to, not by the schema itself).
export const adminUpdateUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").optional(),
  phoneNumber: z.string().trim().min(7, "Enter a valid phone number.").optional(),
  role: z.enum(["MEMBER", "ELECTION_OFFICER", "ELECTION_ADMINISTRATOR", "AUDITOR"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED", "PENDING_ACTIVATION"]).optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

// Creates a brand-new administrative account (ELECTION_OFFICER,
// ELECTION_ADMINISTRATOR, or AUDITOR) — NOT a MEMBER, since member
// accounts only ever originate from membership sync (LLD §7), never
// direct creation. Enforced below via the role enum excluding MEMBER,
// and again in the service layer as a defense-in-depth check.
export const createAdminAccountSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters."),
  role: z.enum(["ELECTION_OFFICER", "ELECTION_ADMINISTRATOR", "AUDITOR"]),
});

export type CreateAdminAccountInput = z.infer<typeof createAdminAccountSchema>;

export const listUsersQuerySchema = z.object({
  role: z.enum(["MEMBER", "ELECTION_OFFICER", "ELECTION_ADMINISTRATOR", "AUDITOR"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED", "PENDING_ACTIVATION"]).optional(),
  search: z.string().trim().optional(), // matches against email or fullName
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const userIdParamSchema = z.object({
  id: z.string().uuid("Invalid user id."),
});