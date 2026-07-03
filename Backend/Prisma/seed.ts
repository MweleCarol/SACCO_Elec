import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { generateKeyPairSync } from "node:crypto";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TRUSTEE_COUNT = 5; // N — matches TRUST_POOL_SIZE_N default
const DEV_PASSWORD = "DevPassword123!"; // every seeded account uses this — change immediately outside dev

async function main() {
  console.log("Seeding SACCO EVS database...\n");
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);

  // --- Trustee pool -------------------------------------------------------
  // Private keys are generated here only because this is a local dev seed
  // script standing in for an out-of-band onboarding ceremony. In a real
  // deployment, each trustee generates their own keypair on their own
  // machine and only ever sends the server their public key.
  console.log(`Creating ${TRUSTEE_COUNT} trustees (SAVE THE PRIVATE KEYS BELOW — printed once):\n`);

  for (let i = 1; i <= TRUSTEE_COUNT; i++) {
    const email = `trustee${i}@sacco.test`;

    const { publicKey, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const user = await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash, role: "TRUSTEE_ADMIN", isActive: true },
      update: {},
    });

    await prisma.trustee.upsert({
      where: { userId: user.id },
      create: { userId: user.id, publicKey, isActive: true },
      update: { publicKey },
    });

    // A fixed, printed TOTP secret so this trustee is immediately usable
    // against a real authenticator app or otplib in a test script.
    const { generateSecret, generateURI } = await import("otplib");
    const totpSecret = generateSecret();
    await prisma.totpSecret.upsert({
      where: { userId: user.id },
      create: { userId: user.id, secret: totpSecret, enabled: true },
      update: { secret: totpSecret, enabled: true },
    });
    const otpauthUri = generateURI({ issuer: "SACCO EVS", label: email, secret: totpSecret });

    console.log(`--- ${email} ---`);
    console.log(`Password:        ${DEV_PASSWORD}`);
    console.log(`TOTP secret:     ${totpSecret}`);
    console.log(`TOTP otpauth URI: ${otpauthUri}`);
    console.log(`Private key (RSA-2048, PEM — keep this, it is NOT stored in the DB):`);
    console.log(privateKey);
    console.log();
  }

  // --- Other role accounts, for exercising the rest of the API ------------
  const otherAccounts: Array<{ email: string; role: "ELECTION_OFFICER" | "AUDITOR" | "SACCO_MANAGEMENT" | "MEMBER" }> = [
    { email: "officer@sacco.test", role: "ELECTION_OFFICER" },
    { email: "auditor@sacco.test", role: "AUDITOR" },
    { email: "management@sacco.test", role: "SACCO_MANAGEMENT" },
    { email: "member1@sacco.test", role: "MEMBER" },
  ];

  for (const { email, role } of otherAccounts) {
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash, role, isActive: true },
      update: {},
    });

    if (role === "MEMBER") {
      await prisma.memberProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, memberNumber: "M-0001", fullName: "Test Member One" },
        update: {},
      });
    }
    console.log(`Created ${role} account: ${email} / ${DEV_PASSWORD} (no TOTP enrolled)`);
  }

  console.log("\nSeed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });