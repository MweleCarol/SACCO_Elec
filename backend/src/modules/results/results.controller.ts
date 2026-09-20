import { Request, Response } from "express";
import { sendSuccess } from "../../shared/responses/ApiResponse";
import * as resultsService from "./results.service";

export async function tally(req: Request, res: Response): Promise<void> {
  const { electionId } = res.locals.validated?.params as { electionId: string };
  await resultsService.tallyResults(req.user!.id, electionId);
  sendSuccess(res, null, "Results tallied.");
}

export async function requestPublish(req: Request, res: Response): Promise<void> {
  const { electionId } = res.locals.validated?.params as { electionId: string };
  const result = await resultsService.requestPublish(req.user!.id, electionId);
  sendSuccess(res, result, "Publication requested — awaiting officer approval.");
}

export async function getResults(req: Request, res: Response): Promise<void> {
  const { electionId } = res.locals.validated?.params as { electionId: string };
  const results = await resultsService.getResults(req.user!.role, electionId);
  sendSuccess(res, results, "Results retrieved.");
}