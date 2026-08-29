import { AppError } from "./AppError";

// Business-rule violations that aren't validation errors: voting twice,
// activating an already-active election, approving your own DAT request,
// duplicate approval from the same officer, etc. — anything where the
// request is well-formed but conflicts with current system state.
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}