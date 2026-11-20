-- Records when an administrator approved the election (review-approval).
-- Members may only see an ARCHIVED election if it was ever approved, so a
-- draft that was cancelled before approval stays hidden from them.
ALTER TABLE "Election" ADD COLUMN "approvedAt" TIMESTAMP(3);

-- Backfill 1: the real approval time, from the audit trail.
UPDATE "Election" e
SET "approvedAt" = a."approvedAt"
FROM (
  SELECT "resourceId", MAX("createdAt") AS "approvedAt"
  FROM "AuditLog"
  WHERE "action" = 'ELECTION_APPROVED' AND "resourceId" IS NOT NULL
  GROUP BY "resourceId"
) a
WHERE a."resourceId" = e."id";

-- Backfill 2: elections that are clearly past approval but have no audit
-- row (for example, created directly in Prisma Studio during testing).
UPDATE "Election"
SET "approvedAt" = COALESCE("activatedAt", "updatedAt")
WHERE "approvedAt" IS NULL
  AND ("status" IN ('APPROVED', 'SCHEDULED', 'ACTIVE', 'CLOSED', 'RESULTS_PUBLISHED')
       OR ("status" = 'ARCHIVED' AND "activatedAt" IS NOT NULL));