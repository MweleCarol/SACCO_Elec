/*
  Warnings:

  - You are about to drop the column `encrypted_payload` on the `votes` table. All the data in the column will be lost.
  - Added the required column `algorithm_version` to the `votes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `auth_tag` to the `votes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `encrypted_vote` to the `votes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `iv` to the `votes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receipt_salt` to the `votes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signature` to the `votes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "votes" DROP COLUMN "encrypted_payload",
ADD COLUMN     "algorithm_version" TEXT NOT NULL,
ADD COLUMN     "auth_tag" TEXT NOT NULL,
ADD COLUMN     "encrypted_vote" TEXT NOT NULL,
ADD COLUMN     "iv" TEXT NOT NULL,
ADD COLUMN     "receipt_salt" TEXT NOT NULL,
ADD COLUMN     "signature" TEXT NOT NULL;
