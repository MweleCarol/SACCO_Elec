import { Router } from 'express';
import { authenticate } from '@modules/auth';
import { requireRole } from '@shared/middleware/requireRole.middleware';
import { validate } from '@shared/middleware/validate.middleware';
import { uuidParamSchema } from '@shared/validators/common.validators';
import {
  createSingleUserSchema,
  listUsersQuerySchema,
} from './users.validator';
import {
  provisionMembersHandler,
  createUserHandler,
  listUsersHandler,
  getUserHandler,
} from './users.controller';

const router = Router();

// Every route below is admin-only for now — narrow on purpose, not yet
// confirmed whether ELECTION_OFFICER should also run bulk provisioning.
router.use(authenticate);

router.post('/provision-members', requireRole('SYSTEM_ADMIN'), provisionMembersHandler);

router.post(
  '/',
  requireRole('SYSTEM_ADMIN'),
  validate({ body: createSingleUserSchema }),
  createUserHandler,
);

router.get(
  '/',
  requireRole('SYSTEM_ADMIN'),
  validate({ query: listUsersQuerySchema }),
  listUsersHandler,
);

router.get(
  '/:id',
  requireRole('SYSTEM_ADMIN'),
  validate({ params: uuidParamSchema }),
  getUserHandler,
);

export default router;