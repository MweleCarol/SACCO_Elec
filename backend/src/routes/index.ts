import { Router } from "express";

// Module routers get mounted here as each one is built — e.g.
// router.use("/auth", authRoutes) in Phase 2, router.use("/elections",
// electionsRoutes) in Phase 4, and so on. Kept as its own file (rather
// than inline in app.ts) so app.ts never has to change again as modules
// are added — only this file does.
const router = Router();

export default router;