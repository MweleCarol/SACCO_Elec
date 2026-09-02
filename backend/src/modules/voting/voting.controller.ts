import { Request, Response } from "express";
import { sendSuccess } from "../../shared/responses/ApiResponse";
import * as votingService from "./voting.service";
import { SubmitBallotInput } from "./voting.schema";

export async function getBallot(req: Request, res: Response): Promise<void> {
  const { electionId } = res.locals.validated?.params as { electionId: string };
  const ballot = await votingService.getBallot(req.user!.id, electionId);
  sendSuccess(res, ballot, "Ballot retrieved.");
}

export async function submitBallot(req: Request, res: Response): Promise<void> {
  const { electionId } = res.locals.validated?.params as { electionId: string };
  const body = res.locals.validated?.body as SubmitBallotInput;
  // Deliberately never echoes selections back — the response confirms
  // ONLY that a vote was recorded and when, per API_CONTRACT.md's
  // explicit requirement for this endpoint.
  const result = await votingService.submitBallot(req.user!.id, electionId, body);
  sendSuccess(res, result, "Vote recorded.");
}

export async function getParticipationStatus(req: Request, res: Response): Promise<void> {
  const { electionId } = res.locals.validated?.params as { electionId: string };
  const status = await votingService.getParticipationStatus(req.user!.id, electionId);
  sendSuccess(res, status, "Participation status retrieved.");
}