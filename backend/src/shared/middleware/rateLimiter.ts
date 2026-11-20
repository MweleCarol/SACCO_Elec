import rateLimit from "express-rate-limit";
import { env } from "../../config/env";
import { sendError } from "../responses/ApiResponse";

// General ceiling for the whole API: a backstop against runaway clients.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, "Too many requests. Please try again later.", 429);
  },
});

// Much stricter, for login, MFA verification, refresh and registration.
// Counted per process and per IP, in memory (a restart clears it).
//
// Only FAILED requests (status 400 and above) count. Counting successes meant a
// handful of normal logins from one IP, such as a SACCO office behind one
// router or a tester in Postman, locked that whole IP out for 15 minutes.
// Brute force is still capped: every wrong password or MFA code counts. The
// per-account lockout in auth.service.ts is a separate, database-backed guard.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, "Too many attempts. Please wait before trying again.", 429);
  },
});