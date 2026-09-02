import { Request, Response } from "express";
import { sendSuccess } from "../../shared/responses/ApiResponse";
import * as usersService from "./users.service";
import { UpdateOwnProfileInput, AdminUpdateUserInput, CreateAdminAccountInput, ListUsersQuery } from "./users.schema";

export async function getMe(req: Request, res: Response): Promise<void> {
  const user = await usersService.getOwnProfile(req.user!.id);
  sendSuccess(res, user, "Profile retrieved.");
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as UpdateOwnProfileInput;
  const user = await usersService.updateOwnProfile(req.user!.id, body);
  sendSuccess(res, user, "Profile updated.");
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = res.locals.validated?.query as ListUsersQuery;
  const result = await usersService.listUsers(query);
  sendSuccess(res, result, "Users retrieved.");
}

export async function adminUpdateUser(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as AdminUpdateUserInput;
  const targetId = (res.locals.validated?.params as { id: string }).id;
  const user = await usersService.adminUpdateUser(req.user!.id, targetId, body);
  sendSuccess(res, user, "User updated.");
}

export async function createAdminAccount(req: Request, res: Response): Promise<void> {
  const body = res.locals.validated?.body as CreateAdminAccountInput;
  const result = await usersService.createAdminAccount(req.user!.id, body);
  sendSuccess(res, result, "Account created. Share the temporary password with the new user securely — it will not be shown again.", 201);
}