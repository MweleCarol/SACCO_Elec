import { Request, Response } from "express";
import { sendSuccess } from "../../shared/responses/ApiResponse";
import * as notificationsService from "./notifications.service";
import { ListNotificationsQuery } from "./notifications.schema";

export async function list(req: Request, res: Response): Promise<void> {
  const query = res.locals.validated?.query as ListNotificationsQuery;
  const result = await notificationsService.listForUser(req.user!.id, query);
  sendSuccess(res, result, "Notifications retrieved.");
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const { id } = res.locals.validated?.params as { id: string };
  const notification = await notificationsService.markRead(req.user!.id, id);
  sendSuccess(res, notification, "Notification marked as read.");
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  await notificationsService.markAllRead(req.user!.id);
  sendSuccess(res, null, "All notifications marked as read.");
}