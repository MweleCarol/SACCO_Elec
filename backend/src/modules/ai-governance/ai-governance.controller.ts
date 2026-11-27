import { Request, Response } from "express";
import { sendSuccess } from "../../shared/responses/ApiResponse";
import * as service from "./ai-governance.service";
import * as copilotService from "./copilot.service";
import { writeAuditLog } from "../audit/audit.service";
import { ListInsightsQuery, AskCopilotInput } from "./ai-governance.schema";

export async function scan(req: Request, res: Response): Promise<void> {
  const result = await service.runScan(req.user!.id);
  sendSuccess(res, result, "Governance scan completed.");
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = res.locals.validated?.query as ListInsightsQuery;
  const result = await service.listInsights(query);
  sendSuccess(res, result, "Insights retrieved.");
}

export async function getById(req: Request, res: Response): Promise<void> {
  const { id } = res.locals.validated?.params as { id: string };
  const insight = await service.getInsightById(id);
  sendSuccess(res, insight, "Insight retrieved.");
}

export async function acknowledge(req: Request, res: Response): Promise<void> {
  const { id } = res.locals.validated?.params as { id: string };
  const insight = await service.acknowledgeInsight(req.user!.id, id);
  sendSuccess(res, insight, "Insight acknowledged.");
}

export async function askCopilot(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as AskCopilotInput;
  const result = await copilotService.askCopilot(body.question, body.history);
  // Who used the AI and when is audited; the question text is not stored.
  await writeAuditLog({
    actorId: req.user!.id, action: "AI_COPILOT_QUERY", outcome: "SUCCESS",
    metadata: { questionLength: body.question.length, turns: body.history.length },
  });
  sendSuccess(res, result, "Copilot response generated.");
}

export async function askAssistant(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as AskCopilotInput;
  const result = await copilotService.askAssistant(body.question, body.history);
  await writeAuditLog({
    actorId: req.user!.id, action: "AI_ASSISTANT_QUERY", outcome: "SUCCESS",
    metadata: { questionLength: body.question.length, turns: body.history.length },
  });
  sendSuccess(res, result, "Assistant response generated.");
}

export async function getReport(req: Request, res: Response): Promise<void> {
  const { electionId } = res.locals.validated?.params as { electionId: string };
  const report = await service.getElectionReport(electionId);
  sendSuccess(res, report, "Report retrieved.");
}