import { Request, Response } from "express";
import { sendSuccess } from "../../shared/responses/ApiResponse";
import * as approvalsService from "./approvals.service";
import { DecisionInput, ListApprovalRequestsQuery } from "./approvals.schema";

export async function list(req: Request, res: Response): Promise<void> {
  const query = res.locals.validated?.query as ListApprovalRequestsQuery;
  const result = await approvalsService.list(query);
  sendSuccess(res, result, "Approval requests retrieved.");
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = res.locals.validated?.params as { id: string };
  const request = await approvalsService.getById(id);
  sendSuccess(res, request, "Approval request retrieved.");
}

export async function decide(req: Request, res: Response): Promise<void> {
  const { id } = res.locals.validated?.params as { id: string };
  const body = res.locals.validated?.body as DecisionInput;
  const result = await approvalsService.decide(req.user!.id, id, body);
  sendSuccess(res, result, "Decision recorded.");
}