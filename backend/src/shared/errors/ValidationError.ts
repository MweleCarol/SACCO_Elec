import { AppError, FieldError } from "./AppError";

// Thrown by the validate middleware when Zod parsing fails. Carries the
// full field-level breakdown so the client can highlight specific inputs.
export class ValidationError extends AppError {
  constructor(errors: FieldError[], message = "Validation failed.") {
    super(message, 422, errors);
  }
}