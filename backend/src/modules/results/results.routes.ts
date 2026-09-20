import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./results.controller";
import { electionIdParamSchema } from "./results.schema";

export const router = Router({ mergeParams: true });
router.use(authenticate);

router.get("/results", validate({ params: electionIdParamSchema }), controller.getResults);
router.post(
  "/results/tally", authorize("ELECTION_OFFICER"),
  validate({ params: electionIdParamSchema }), controller.tally
);
router.post(
  "/results/publish", authorize("ELECTION_OFFICER"),
  validate({ params: electionIdParamSchema }), controller.requestPublish
);