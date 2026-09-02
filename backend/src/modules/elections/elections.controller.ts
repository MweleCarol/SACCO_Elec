import { Request, Response } from "express";
import { sendSuccess } from "../../shared/responses/ApiResponse";
import * as electionsService from "./elections.service";
import {
  CreateElectionInput, UpdateElectionInput, RescheduleElectionInput,
  CancelElectionInput, ReviewApprovalInput, ListElectionsQuery,
} from "./elections.schema";

function idParam(res: Response): string {
  return (res.locals.validated?.params as { id: string }).id;
}

export async function create(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as CreateElectionInput;
  const election = await electionsService.createElection(req.user!.id, body);
  sendSuccess(res, election, "Election created successfully.", 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as UpdateElectionInput;
  const election = await electionsService.updateElection(req.user!.id, idParam(res), body);
  sendSuccess(res, election, "Election updated.");
}

export async function getById(req: Request, res: Response): Promise<void> {
  const election = await electionsService.getElection(idParam(res));
  sendSuccess(res, election, "Election retrieved.");
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = res.locals.validated?.query as ListElectionsQuery;
  const result = await electionsService.listElections(query);
  sendSuccess(res, result, "Elections retrieved.");
}

export async function submitForApproval(req: Request, res: Response): Promise<void> {
  const election = await electionsService.submitForApproval(req.user!.id, idParam(res));
  sendSuccess(res, election, "Election submitted for approval.");
}

export async function reviewApproval(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as ReviewApprovalInput;
  const election = await electionsService.reviewApproval(req.user!.id, idParam(res), body);
  sendSuccess(res, election, `Election ${body.decision === "APPROVE" ? "approved" : "sent back for edits"}.`);
}

export async function activate(req: Request, res: Response): Promise<void> {
  const election = await electionsService.activateElection(req.user!.id, idParam(res));
  sendSuccess(res, election, "Election activated.");
}

export async function close(req: Request, res: Response): Promise<void> {
  const election = await electionsService.closeElection(req.user!.id, idParam(res));
  sendSuccess(res, election, "Election closed.");
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as CancelElectionInput;
  const election = await electionsService.cancelElection(req.user!.id, idParam(res), body.reason);
  sendSuccess(res, election, "Election cancelled.");
}

export async function reschedule(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as RescheduleElectionInput;
  const election = await electionsService.rescheduleElection(req.user!.id, idParam(res), body);
  sendSuccess(res, election, "Election rescheduled.");
}