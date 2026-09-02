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
// app-wide) sits in front of every credential/token-handling endpoint —
// task spec §25's "rate limiting for sensitive endpoints" requirement.
router.post("/register", authLimiter, validate({ body: registerSchema }), controller.register);
router.post("/login", authLimiter, validate({ body: loginSchema }), controller.login);
router.post("/verify-mfa", authLimiter, validate({ body: verifyMfaSchema }), controller.verifyMfa);
router.post("/refresh", authLimiter, validate({ body: refreshSchema }), controller.refresh);

router.post("/logout", authenticate, controller.logout);
router.get("/me", authenticate, controller.me);
router.post("/mfa/enroll", authenticate, controller.enrollMfa);
router.post("/mfa/confirm", authenticate, validate({ body: mfaConfirmSchema }), controller.confirmMfa);
router.patch("/me/password", authenticate, validate({ body: changePasswordSchema }), controller.changePassword);

export default router;