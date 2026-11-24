import { Request, Response } from "express";
import { sendSuccess } from "../../shared/responses/ApiResponse";
import * as candidatesService from "./candidates.service";
import {
  CandidateDecisionInput,
  WithdrawCandidateInput,
  ListCandidatesQuery,
  SelfNominationInput,
} from "./candidates.schema";

export async function list(req: Request, res: Response): Promise<void> {
  const { electionId } = res.locals.validated?.params as { electionId: string };
  const query = res.locals.validated?.query as ListCandidatesQuery;
  const candidates = await candidatesService.listCandidates(
    req.user!.role,
    electionId,
    query ?? {},
  );
  sendSuccess(res, candidates, "Candidates retrieved.");
}

export async function decide(req: Request, res: Response): Promise<void> {
  const { id } = res.locals.validated?.params as { id: string };
  const body = res.locals.validated?.body as CandidateDecisionInput;
  const candidate = await candidatesService.decideCandidate(
    req.user!.id,
    id,
    body,
  );
  sendSuccess(
    res,
    candidate,
    `Candidate ${body.decision === "APPROVE" ? "approved" : "rejected"}.`,
  );
}

export async function withdraw(req: Request, res: Response): Promise<void> {
  const { id } = res.locals.validated?.params as { id: string };
  const body = res.locals.validated?.body as WithdrawCandidateInput;
  const candidate = await candidatesService.withdrawCandidate(
    req.user!.id,
    req.user!.role,
    id,
    body.reason,
  );
  sendSuccess(res, candidate, "Candidacy withdrawn.");
}

export async function nominateSelf(req: Request, res: Response): Promise<void> {
  const { electionId } = res.locals.validated?.params as { electionId: string };
  const body = res.locals.validated?.body as SelfNominationInput;
  const candidate = await candidatesService.nominateSelf(
    req.user!.id,
    electionId,
    body,
  );
  sendSuccess(
    res,
    candidate,
    "Nomination submitted. An election officer will review it.",
    201,
  );
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const candidacies = await candidatesService.listMyCandidacies(req.user!.id);
  sendSuccess(res, candidacies, "Your nominations retrieved.");
}
