import { Router } from "express";
import { authenticate } from "../../shared/middleware/authenticate";
import { validate } from "../../shared/middleware/validate";
import * as controller from "./notifications.controller";
import { listNotificationsQuerySchema, notificationIdParamSchema } from "./notifications.schema";

const router = Router();
router.use(authenticate);

router.get("/", validate({ query: listNotificationsQuerySchema }), controller.list);
router.patch("/read-all", controller.markAllRead);
router.patch("/:id/read", validate({ params: notificationIdParamSchema }), controller.markRead);

export default router;