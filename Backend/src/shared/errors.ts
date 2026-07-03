export class AppError extends Error {
  constructor(message: string, public statusCode: number = 500, public code: string = "APP_ERROR") {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) { super(message, 400, "VALIDATION_ERROR"); }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication failed") { super(message, 401, "AUTHENTICATION_ERROR"); }
}

export class NotFoundError extends AppError {
  constructor(entity: string) { super(`${entity} not found`, 404, "NOT_FOUND"); }
}

// --- Distributed administrative trust errors (see LLD section 8) ---------

export class InvalidSignatureError extends AppError {
  constructor() { super("Approval signature failed verification against trustee public key", 400, "INVALID_SIGNATURE"); }
}

export class DuplicateApprovalError extends AppError {
  constructor() { super("This trustee has already submitted a decision for this action", 409, "DUPLICATE_APPROVAL"); }
}

export class InsufficientApprovalsError extends AppError {
  constructor(current: number, required: number) {
    super(`Threshold not yet reached (${current}/${required} approvals)`, 409, "INSUFFICIENT_APPROVALS");
  }
}

export class ActionExpiredError extends AppError {
  constructor() { super("This pending action has expired", 410, "ACTION_EXPIRED"); }
}

export class TrusteeInactiveError extends AppError {
  constructor() { super("Trustee is not active", 403, "TRUSTEE_INACTIVE"); }
}

export class ThresholdMisconfiguredError extends AppError {
  constructor() { super("Threshold M must satisfy 1 < M <= N", 500, "THRESHOLD_MISCONFIGURED"); }
}

export class ActionAlreadyFinalizedError extends AppError {
  constructor() { super("This pending action has already been executed, rejected, or expired", 409, "ACTION_ALREADY_FINALIZED"); }
}