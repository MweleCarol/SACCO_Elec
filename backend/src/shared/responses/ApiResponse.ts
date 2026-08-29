import { Response } from "express";
import { FieldError } from "../errors/AppError";

// Enforces the single response envelope from API_CONTRACT.md everywhere
// in the codebase — no controller should ever call res.json() directly.
export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Request successful.",
  statusCode = 200
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: FieldError[]
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
}