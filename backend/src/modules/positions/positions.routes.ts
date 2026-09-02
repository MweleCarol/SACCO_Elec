import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./positions.controller";
import { createPositionSchema, updatePositionSchema, electionIdParamSchema, positionIdParamSchema } from "./positions.schema";

// Nested under /elections/:electionId/positions
export const nestedRouter = Router({ mergeParams: true });
nestedRouter.use(authenticate);
nestedRouter.get("/", validate({ params: electionIdParamSchema }), controller.list);
nestedRouter.post(
  "/", authorize("ELECTION_OFFICER"),
  validate({ params: electionIdParamSchema, body: createPositionSchema }), controller.create
);

// Standalone /positions/:id
export const standaloneRouter = Router();
standaloneRouter.use(authenticate);
standaloneRouter.patch(
  "/:id", authorize("ELECTION_OFFICER"),
  validate({ params: positionIdParamSchema, body: updatePositionSchema }), controller.update
);
standaloneRouter.delete(
  "/:id", authorize("ELECTION_OFFICER"),
  validate({ params: positionIdParamSchema }), controller.remove
);