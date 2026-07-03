import rateLimit from "express-rate-limit";

/**
 * For password/TOTP-guessing endpoints: login, TOTP verification/confirmation,
 * and trust approvals (which also require a live TOTP code). Keyed by IP by
 * default via express-rate-limit's built-in store, which is in-memory and
 * per-process — fine for a single instance, but note for later: a
 * multi-instance deployment needs a shared store (e.g. Redis) or this limit
 * is trivially bypassed by hitting a different instance.
 */
export const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_ATTEMPTS", message: "Too many attempts, please try again later" } },
});

/** Slightly more lenient — token refresh isn't a guessing attack surface the same way. */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_ATTEMPTS", message: "Too many attempts, please try again later" } },
});