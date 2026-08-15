// LLD §8.3 (administrator initiates synchronization) + §8.8 Security
// Controls ("Restricted synchronization permissions — Election
// Administrator only").
//
// "Election Administrator" is LLD prose, not a literal role name — the
// six actual roles (per the handoff) are SYSTEM_ADMIN, ELECTION_OFFICER,
// VERIFICATION_OFFICER, MEMBER, AUDITOR, OBSERVER. Defaulting to
// SYSTEM_ADMIN + ELECTION_OFFICER as the broadest reasonable reading —
// confirm or narrow this before treating it as final.
//
// This file is also where Express.Multer.File's ambient type
// augmentation actually enters the compiled program (via the `multer`
// import below) — membership-sync.controller.ts's req.file typing only
// resolves once this file exists and is part of the build.

import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '@modules/auth';
import { requireRole } from '@shared/middleware/requireRole.middleware'; // ASSUMED signature: requireRole(...roleNames: RoleName[]) — confirm against the real file if this doesn't compile
import { uploadMembershipCsv } from './membership-sync.controller';

const upload = multer({
  storage: multer.memoryStorage(), // buffer in memory, not disk — the controller reads req.file.buffer directly; no temp-file cleanup needed for a file this small
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB — arbitrary but generous for a membership CSV; adjust if real exports run larger
  fileFilter: (_req, file, cb) => {
    const isCsv =
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' || // Excel-exported CSVs are frequently reported under this mimetype, not text/csv — checking extension too rather than trusting mimetype alone
      file.originalname.toLowerCase().endsWith('.csv');

    if (!isCsv) {
      cb(new Error('Only .csv files are accepted.'));
      return;
    }
    cb(null, true);
  },
});

const router = Router();

router.post(
  '/upload',
  authenticate,
  requireRole('SYSTEM_ADMIN', 'ELECTION_OFFICER'),
  upload.single('file'),
  uploadMembershipCsv,
);

export { router as membershipSyncRoutes };