import { Request, Response } from "express";
import { sendSuccess } from "../../shared/responses/ApiResponse";
import * as candidatesService from "./candidates.service";
import {
  CreateCandidateInput, UpdateCandidateInput, CandidateDecisionInput, WithdrawCandidateInput, ListCandidatesQuery,
} from "./candidates.schema";

export async function list(req: Request, res: Response): Promise<void> {
  const { electionId } = res.locals.validated?.params as { electionId: string };
  const query = res.locals.validated?.query as ListCandidatesQuery;
  const candidates = await candidatesService.listCandidates(electionId, query ?? {});
  sendSuccess(res, candidates, "Candidates retrieved.");
}

export async function register(req: Request, res: Response): Promise<void> {
  const { electionId } = res.locals.validated?.params as { electionId: string };
  const body = res.locals.validated?.body as CreateCandidateInput;
  const candidate = await candidatesService.registerCandidate(req.user!.id, electionId, body);
  sendSuccess(res, candidate, "Candidate registered.", 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = res.locals.validated?.params as { id: string };
  const body = res.locals.validated?.body as UpdateCandidateInput;
  const candidate = await candidatesService.updateCandidate(req.user!.id, id, body);
  sendSuccess(res, candidate, "Candidate updated.");
}

export async function decide(req: Request, res: Response): Promise<void> {
  const { id } = res.locals.validated?.params as { id: string };
  const body = res.locals.validated?.body as CandidateDecisionInput;
  const candidate = await candidatesService.decideCandidate(req.user!.id, id, body);
  sendSuccess(res, candidate, `Candidate ${body.decision === "APPROVE" ? "approved" : "rejected"}.`);
}

export async function withdraw(req: Request, res: Response): Promise<void> {
  const { id } = res.locals.validated?.params as { id: string };
  const body = res.locals.validated?.body as WithdrawCandidateInput;
  const candidate = await candidatesService.withdrawCandidate(req.user!.id, req.user!.role, id, body.reason);
  sendSuccess(res, candidate, "Candidacy withdrawn.");
}