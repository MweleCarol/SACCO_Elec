import { Request, Response, NextFunction } from 'express';
import { getRoleIds } from '@shared/cache/role.cache';
import { AuthenticationError, AuthorizationError } from '@shared/errors';
import { asyncHandler } from '@shared/middleware/asyncHandler';
import { RoleName } from '@shared/types/role.types';

export function requireRole(...roleNames: RoleName[]) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      // 401, not 403: the requester was never identified at all.
      // This should only fire if a route wired requireRole without
      // authenticate() in front of it — a misconfiguration, not a
      // normal permission denial.
      throw new AuthenticationError('Authentication required before authorization can be checked.');
    }

    const allowedIds = await getRoleIds(roleNames);

    if (!allowedIds.includes(req.user.roleId)) {
      throw new AuthorizationError(); // default message — no role names leaked to the client
    }

    next();
  });
}