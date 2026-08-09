import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './token.util';
import { AuthenticationError } from '@shared/errors';
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface';

/**
 * Lives in modules/auth/, not shared/middleware/, deliberately: it
 * can't do its job without verifyAccessToken, which is auth-module
 * internal logic. A file that fundamentally depends on one module's
 * internals isn't shared infrastructure, even though every other
 * module needs to use it — that's a normal module-to-module
 * dependency (via this module's index.ts barrel), not a layering
 * violation. Importing AuthenticatedUser straight from
 * shared/interfaces rather than through auth.dto.ts for the same
 * reason: this file shouldn't care which auth-module file happens to
 * re-export it, only what shared/ says the canonical shape is.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw new AuthenticationError('Authentication required.');
  }

  const token = header.slice('Bearer '.length).trim();

  /**
   * verifyAccessToken() ALREADY rejects anything that isn't purpose:
   * 'access' — that check lives inside token.util.ts's verifyToken,
   * enforced the moment this line runs. An mfa_pending token handed
   * to this middleware fails HERE, inside this single call, not via
   * a separate purpose check this file has to remember to write.
   * The enforcement point is the token verification itself, not a
   * convention every middleware has to independently honor.
   */
  const payload = verifyAccessToken(token);

  const user: AuthenticatedUser = { userId: payload.userId, roleId: payload.roleId };
  req.user = user;

  next();
}