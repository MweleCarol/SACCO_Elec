import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authLimiter } from "../../shared/middleware/rateLimiter";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./auth.controller";
import {
  registerSchema, loginSchema, verifyMfaSchema, refreshSchema, mfaConfirmSchema, changePasswordSchema,
} from "./auth.schema";

const router = Router();

// authLimiter (stricter than the general apiLimiter already applied
// app-wide) sits in front of every endpoint that checks something a person
// could guess: a password, an MFA code, membership details — task spec §25's
// "rate limiting for sensitive endpoints" requirement.
router.post("/register", authLimiter, validate({ body: registerSchema }), controller.register);
router.post("/login", authLimiter, validate({ body: loginSchema }), controller.login);
router.post("/verify-mfa", authLimiter, validate({ body: verifyMfaSchema }), controller.verifyMfa);

// /refresh is deliberately NOT behind authLimiter. The frontend calls it on
// every page load to restore a session, so a logged-out visitor's call fails
// (no cookie). Counted as failures, ten logged-out page loads from one IP —
// a SACCO office sharing one connection — blocked logins for everyone there
// for 15 minutes. Refresh tokens are 64 random bytes and cannot be guessed,
// so there is nothing to brute-force; the app-wide apiLimiter still applies.
router.post("/refresh", validate({ body: refreshSchema }), controller.refresh);

router.post("/logout", authenticate, controller.logout);
router.get("/me", authenticate, controller.me);
router.post("/mfa/enroll", authenticate, controller.enrollMfa);
router.post("/mfa/confirm", authenticate, validate({ body: mfaConfirmSchema }), controller.confirmMfa);
router.patch("/me/password", authenticate, validate({ body: changePasswordSchema }), controller.changePassword);

export default router;