-- A cancelled election ends in ARCHIVED, like a finished one. These two
-- columns tell the two apart and keep the reason members are shown.
ALTER TABLE "Election" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Election" ADD COLUMN "cancellationReason" TEXT;