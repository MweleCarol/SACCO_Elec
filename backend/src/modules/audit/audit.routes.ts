import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./audit.controller";
import { listAuditLogsQuerySchema, auditLogIdParamSchema, verifyChainQuerySchema } from "./audit.schema";

const router = Router();
router.use(authenticate, authorize("AUDITOR", "ELECTION_ADMINISTRATOR"));

router.get("/verify-chain", validate({ query: verifyChainQuerySchema }), controller.verifyChain);
router.get("/:id", validate({ params: auditLogIdParamSchema }), controller.getById);
router.get("/", validate({ query: listAuditLogsQuerySchema }), controller.list);

export default router;