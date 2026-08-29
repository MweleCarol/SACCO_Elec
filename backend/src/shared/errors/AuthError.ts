import { AppError } from "./AppError";

// Authentication failures only: bad credentials, missing/expired/invalid
// JWT, invalid MFA code, revoked/reused refresh token. Authorization
// (role/permission) failures use ForbiddenError instead — keeping these
// separate matters because 401 should prompt the client to re-authenticate,
// while 403 should not.
export class AuthError extends AppError {
  constructor(message = "Authentication failed.") {
    super(message, 401);
  }
}