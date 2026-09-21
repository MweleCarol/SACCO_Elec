import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./voting.controller";
import { submitBallotSchema, electionIdParamSchema } from "./voting.schema";

export const router = Router({ mergeParams: true });

router.get(
  "/ballot", authenticate, authorize("MEMBER"),
  validate({ params: electionIdParamSchema }), controller.getBallot
);
router.post(
  "/ballot", authenticate, authorize("MEMBER"),
  validate({ params: electionIdParamSchema, body: submitBallotSchema }), controller.submitBallot
);
router.get(
  "/participation/me", authenticate, authorize("MEMBER"),
  validate({ params: electionIdParamSchema }), controller.getParticipationStatus
);