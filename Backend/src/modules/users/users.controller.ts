import type { Request, Response } from 'express';
import { asyncHandler } from '@shared/middleware/asyncHandler';
import { sendSuccess } from '@shared/helpers/response.helper';
import { HTTP_STATUS } from '@shared/constants/http-status.constants';
import type { UuidParam } from '@shared/validators/common.validators';
import {
  provisionEligibleMembers,
  createSingleUserAccount,
  getUsersList,
  getUserDetail,
} from './users.service';
import type { CreateSingleUserParsed, ListUsersQueryParsed } from './users.validator';

export const provisionMembersHandler = asyncHandler(async (_req: Request, res: Response) => {
  const summary = await provisionEligibleMembers();
  sendSuccess(res, summary, 'Provisioning completed.');
});

export const createUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await createSingleUserAccount(req.body as CreateSingleUserParsed);
  sendSuccess(res, result, 'User created.', HTTP_STATUS.CREATED);
});

export const listUsersHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getUsersList(req.query as unknown as ListUsersQueryParsed);
  sendSuccess(res, result, 'Users retrieved.');
});

export const getUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as UuidParam;
  const result = await getUserDetail(id);
  sendSuccess(res, result, 'User retrieved.');
});