import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./elections.controller";
import {
  createElectionSchema, updateElectionSchema, rescheduleElectionSchema,
  cancelElectionSchema, reviewApprovalSchema, listElectionsQuerySchema, electionIdParamSchema,
} from "./elections.schema";

const router = Router();

router.use(authenticate);

router.get("/", validate({ query: listElectionsQuerySchema }), controller.list);
router.get("/:id", validate({ params: electionIdParamSchema }), controller.getById);

router.post("/", authorize("ELECTION_OFFICER"), validate({ body: createElectionSchema }), controller.create);
router.patch(
  "/:id", authorize("ELECTION_OFFICER"),
  validate({ params: electionIdParamSchema, body: updateElectionSchema }), controller.update
);
router.post(
  "/:id/submit-approval", authorize("ELECTION_OFFICER"),
  validate({ params: electionIdParamSchema }), controller.submitForApproval
);
router.post(
  "/:id/review-approval", authorize("ELECTION_ADMINISTRATOR"), // TEMPORARY STOPGAP — Phase 7 replaces this
  validate({ params: electionIdParamSchema, body: reviewApprovalSchema }), controller.reviewApproval
);
router.post(
  "/:id/activate", authorize("ELECTION_OFFICER"),
  validate({ params: electionIdParamSchema }), controller.activate
);
router.post(
  "/:id/close", authorize("ELECTION_OFFICER"),
  validate({ params: electionIdParamSchema }), controller.close
);
router.post(
  "/:id/cancel", authorize("ELECTION_ADMINISTRATOR"), // TEMPORARY STOPGAP — Phase 7 replaces this
  validate({ params: electionIdParamSchema, body: cancelElectionSchema }), controller.cancel
);
router.post(
  "/:id/reschedule", authorize("ELECTION_OFFICER"),
  validate({ params: electionIdParamSchema, body: rescheduleElectionSchema }), controller.reschedule
);

export default router;