import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./voting.controller";
import { submitBallotSchema, electionIdParamSchema } from "./voting.schema";

// Nested under /elections/:electionId/... — voting is exclusively a
// MEMBER action, so authorize("MEMBER") is applied once at the router
// level rather than per-route.
export const router = Router({ mergeParams: true });
router.use(authenticate, authorize("MEMBER"));

router.get("/ballot", validate({ params: electionIdParamSchema }), controller.getBallot);
router.post("/ballot", validate({ params: electionIdParamSchema, body: submitBallotSchema }), controller.submitBallot);
router.get("/participation/me", validate({ params: electionIdParamSchema }), controller.getParticipationStatus);