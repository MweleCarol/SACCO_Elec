import { Request, Response } from "express";
import { sendSuccess } from "../../shared/responses/ApiResponse";
import * as auditService from "./audit.service";
import { ListAuditLogsQuery, VerifyChainQuery } from "./audit.schema";

export async function list(req: Request, res: Response): Promise<void> {
  const query = res.locals.validated?.query as ListAuditLogsQuery;
  const result = await auditService.listLogs(query);
  sendSuccess(res, result, "Audit logs retrieved.");
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = res.locals.validated?.params as { id: string };
  const log = await auditService.getById(id);
  sendSuccess(res, log, "Audit log entry retrieved.");
}

export async function verifyChain(req: Request, res: Response): Promise<void> {
  const query = res.locals.validated?.query as VerifyChainQuery;
  const result = await auditService.verifyChain(query.dateFrom, query.dateTo);
  sendSuccess(res, result, result.intact ? "Audit chain is intact." : "Audit chain integrity issues detected.");
}