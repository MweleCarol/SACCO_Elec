export interface FieldError {
  field?: string;
  message: string;
}

// Base class for every error that carries a deliberate, known HTTP status
// code. The global error handler treats `isOperational: true` errors as
// "safe to show the client" and anything else (a raw thrown Error, a
// Prisma internals error, a bug) as "log fully, return a generic 500" —
// see task spec §24: never expose stack traces or internal details.
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: FieldError[];
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, errors?: FieldError[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}