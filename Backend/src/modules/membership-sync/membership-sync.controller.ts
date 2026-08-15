// LLD §8.3 Synchronization Workflow (step 1 — administrator uploads a
// CSV to initiate synchronization), §8.8 Security Controls
// ("Restricted synchronization permissions — Election Administrator
// only," enforced via requireRole middleware in
// membership-sync.routes.ts, NOT here — this file assumes that
// middleware has already run by the time this handler executes).
//
// HTTP-only: reads the uploaded file into text, resolves the requested
// sync mode, calls the service, shapes and sends the response. No
// Prisma, no CSV-parsing logic, no business rules — those live one
// layer down.

import { Request, Response } from 'express';
import { asyncHandler } from '@shared/middleware/asyncHandler';
import { sendSuccess } from '@shared/helpers/response.helper';
import { ValidationError } from '@shared/errors'; // ASSUMED: exported from the shared error hierarchy per the handoff's AppError list — confirm exact import path/constructor signature if this doesn't compile
import { SyncStatus } from '@shared/enums';
import type { SyncMode } from '@shared/enums';
import { runMembershipSync } from './membership-sync.service';
import { toSyncReportDto } from './membership-sync.dto'; // NOT YET WRITTEN — next file; expected compile gap until it exists

// No custom Request-extending interface here, deliberately: req.file
// (from multer) and req.user (from the `authenticate` middleware) are
// both added via global ambient augmentation (multer's own types once
// routes.ts imports it; express.d.ts for req.user) — extending Request
// ourselves would narrow the parameter type asyncHandler expects and
// risks a contravariance error under strictFunctionTypes.

export const uploadMembershipCsv = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded. Expected a CSV file under the "file" field.');
  }
 
  const mode = resolveSyncMode(req.body?.mode);
  const initiatedById = req.user?.userId ?? null;
 
  const csvText = req.file.buffer.toString('utf-8');
 
  const startedAt = Date.now();
  const result = await runMembershipSync(csvText, mode, initiatedById);
  const durationMs = Date.now() - startedAt;
 
  const report = toSyncReportDto(result, durationMs);
 
  sendSuccess(res, report, buildResultMessage(result.status));
});
 
/**
 * Defaults to FULL when the administrator didn't specify a mode, or
 * sent something unrecognized — LLD §8.5 describes Full Synchronization
 * as "typically performed before the start of an election," the safer
 * default for an ambiguous request than silently assuming Incremental.
 */
function resolveSyncMode(raw: unknown): SyncMode {
  return raw === 'INCREMENTAL' ? 'INCREMENTAL' : 'FULL';
}

/**
 * A FAILED or PARTIAL_SUCCESS sync run is still a successful HTTP
 * request — the upload was received and processed; the report just
 * says the sync itself didn't fully succeed. That distinction is what
 * `data.status` in the response body is for, not the HTTP status code
 * (which stays 200 via sendSuccess's default) — this message just makes
 * that distinction readable without the client having to branch on the
 * status field first.
 */
function buildResultMessage(status: SyncStatus): string {
  switch (status) {
    case SyncStatus.SUCCESS:
      return 'Membership synchronization completed successfully.';
    case SyncStatus.PARTIAL_SUCCESS:
      return 'Membership synchronization completed with some records rejected or failed.';
    case SyncStatus.FAILED:
      return 'Membership synchronization failed.';
    default:
      return 'Membership synchronization finished.';
  }
}