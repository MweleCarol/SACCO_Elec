/*
  Warnings:

  - You are about to drop the column `records_flagged` on the `sync_logs` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'PARTIAL_SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "sync_logs" DROP COLUMN "records_flagged",
ADD COLUMN     "records_failed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "records_received" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "records_rejected" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "SyncStatus" NOT NULL DEFAULT 'FAILED';
