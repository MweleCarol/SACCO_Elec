import { Request, Response } from "express";
import { sendSuccess } from "../../shared/responses/ApiResponse";
import * as positionsService from "./positions.service";
import { CreatePositionInput, UpdatePositionInput } from "./positions.schema";

export async function list(req: Request, res: Response): Promise<void> {
  const { electionId } = res.locals.validated?.params as { electionId: string };
  const positions = await positionsService.listPositions(electionId);
  sendSuccess(res, positions, "Positions retrieved.");
}

export async function create(req: Request, res: Response): Promise<void> {
  const { electionId } = res.locals.validated?.params as { electionId: string };
  const body = res.locals.validated?.body as CreatePositionInput;
  const position = await positionsService.createPosition(req.user!.id, electionId, body);
  sendSuccess(res, position, "Position created.", 201);
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = res.locals.validated?.params as { id: string };
  const body = res.locals.validated?.body as UpdatePositionInput;
  const position = await positionsService.updatePosition(req.user!.id, id, body);
  sendSuccess(res, position, "Position updated.");
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = res.locals.validated?.params as { id: string };
  await positionsService.deletePosition(req.user!.id, id);
  sendSuccess(res, null, "Position deleted.");
}