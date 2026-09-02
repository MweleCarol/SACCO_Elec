import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./users.controller";
import {
  updateOwnProfileSchema, adminUpdateUserSchema, createAdminAccountSchema, listUsersQuerySchema, userIdParamSchema,
} from "./users.schema";

const router = Router();

router.use(authenticate); // every route below requires a logged-in user

router.get("/me", controller.getMe);
router.patch("/me", validate({ body: updateOwnProfileSchema }), controller.updateMe);

router.get("/", authorize("ELECTION_ADMINISTRATOR"), validate({ query: listUsersQuerySchema }), controller.listUsers);
router.post("/", authorize("ELECTION_ADMINISTRATOR"), validate({ body: createAdminAccountSchema }), controller.createAdminAccount);
router.patch(
  "/:id",
  authorize("ELECTION_ADMINISTRATOR"),
  validate({ params: userIdParamSchema, body: adminUpdateUserSchema }),
  controller.adminUpdateUser
);

export default router;