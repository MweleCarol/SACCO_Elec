import { UserRole } from "@prisma/client";

// Populated by the authenticate middleware (Phase 2) after verifying the
// JWT — every downstream handler can trust req.user without re-checking
// the token. Deliberately minimal: anything else about the user (email,
// full profile) should be fetched fresh from the DB by the service layer,
// not trusted from a token payload that could be stale.
export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

// Populated by the validate middleware (Phase 2) after a Zod schema has
// parsed and coerced req.body/query/params — controllers read from here
// instead of touching req.body directly, so there's one place that
// guarantees "this data has already been validated."
export interface ValidatedRequestData {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
    interface Locals {
      validated?: ValidatedRequestData;
    }
  }
}

export {};