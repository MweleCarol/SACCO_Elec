/*
  Warnings:

  - You are about to drop the column `revoked` on the `refresh_tokens` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "refresh_tokens" DROP COLUMN "revoked";

-- CreateTable
CREATE TABLE "account_activations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_activations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_activations_user_id_expires_at_idx" ON "account_activations"("user_id", "expires_at");

-- AddForeignKey
ALTER TABLE "account_activations" ADD CONSTRAINT "account_activations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
