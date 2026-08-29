import { AppError } from "./AppError";

// The user IS authenticated but lacks the role/permission for this
// operation — e.g. a MEMBER hitting an ELECTION_OFFICER-only endpoint.
export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, 403);
  }
}