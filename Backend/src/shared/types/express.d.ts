// src/shared/types/express.d.ts
import type { AuthenticatedUser } from '@shared/interfaces/authenticated-user.interface';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};