import { Request, Response } from "express";
import { sendSuccess } from "../../shared/responses/ApiResponse";
import * as membershipSyncService from "./membership-sync.service";
import { RunSyncInput } from "./membership-sync.schema";

export async function runSync(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as RunSyncInput;
  const result = await membershipSyncService.runMembershipSync(body.records, req.user!.id);
  sendSuccess(res, result, "Membership sync completed.");
}