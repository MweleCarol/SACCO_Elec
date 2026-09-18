import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./approvals.controller";
import { decisionSchema, listApprovalRequestsQuerySchema, requestIdParamSchema } from "./approvals.schema";

const router = Router();
router.use(authenticate);

router.get(
  "/", authorize("ELECTION_OFFICER", "ELECTION_ADMINISTRATOR", "AUDITOR"),
  validate({ query: listApprovalRequestsQuerySchema }), controller.list
);
router.get(
  "/:id", authorize("ELECTION_OFFICER", "ELECTION_ADMINISTRATOR", "AUDITOR"),
  validate({ params: requestIdParamSchema }), controller.getById
);
router.post(
  "/:id/decide", authorize("ELECTION_OFFICER", "ELECTION_ADMINISTRATOR"),
  validate({ params: requestIdParamSchema, body: decisionSchema }), controller.decide
);

export default router;