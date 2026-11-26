-- One-time backup codes for two-factor sign-in. Only a keyed hash of each code
-- is stored (HMAC-SHA256 with the server's encryption key), never the code.
-- usedAt is set when a code is spent; a spent code can never be used again.
CREATE TABLE "MfaBackupCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaBackupCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MfaBackupCode_userId_codeHash_key" ON "MfaBackupCode"("userId", "codeHash");
CREATE INDEX "MfaBackupCode_userId_idx" ON "MfaBackupCode"("userId");

ALTER TABLE "MfaBackupCode" ADD CONSTRAINT "MfaBackupCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;