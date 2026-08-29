import rateLimit from "express-rate-limit";
import { sendError } from "../responses/ApiResponse";

// General ceiling for the whole API — generous, mainly a backstop against
// runaway clients/scripts rather than a security control on its own.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    sendError(res, "Too many requests. Please try again later.", 429);
  },
});

// Much stricter — for login, MFA verification, and refresh (Phase 2).
// This is the actual security control: it makes credential-stuffing and
// TOTP brute-force against a single account impractical, per task spec
// §25 ("rate limiting for sensitive endpoints").
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Keyed by IP + email/body identifier would be more precise, but
  // req.body isn't guaranteed parsed at this point depending on
  // middleware order — IP-only is the safe default; revisit if shared-IP
  // false positives (e.g. office NAT) become a real problem.
  handler: (req, res) => {
    sendError(res, "Too many attempts. Please wait before trying again.", 429);
  },
});