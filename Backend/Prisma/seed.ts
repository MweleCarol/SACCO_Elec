import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import "dotenv/config";

// --- Production guard -------------------------------------------------------
// This script creates privileged TRUSTEE_ADMIN accounts with a well-known
// password and generates RSA private keys. It must never run against a real
// environment: a misconfigured DATABASE_URL pointed at staging/production
// must not silently seed a backdoor account there.
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "Refusing to run the dev seed script with NODE_ENV=production. " +
    "If you really need to seed a non-local database, do it manually and never with these fixed credentials."
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TRUSTEE_COUNT = 5; // N — matches TRUST_POOL_SIZE_N default
const DEV_PASSWORD = "DevPassword123!"; // every seeded account uses this — local dev only

// Secrets go to a gitignored local file, never to stdout/CI logs (CWE-532).
const OUTPUT_DIR = join(process.cwd(), "prisma", ".seed-output");
const OUTPUT_FILE = join(OUTPUT_DIR, "dev-credentials.local.txt");

interface Emitter {
  write(line: string): void;
  close(): void;
}

function createSecretsFile(): Emitter {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const lines: string[] = [
    `Generated ${new Date().toISOString()} — LOCAL DEV CREDENTIALS ONLY. Do not commit, do not reuse.`,
    "",
  ];
  return {
    write(line: string) {
      lines.push(line);
    },
    close() {
      // mode 0o600: owner read/write only. No-op on Windows filesystems that
      // don't support POSIX permissions, but harmless there too.
      writeFileSync(OUTPUT_FILE, lines.join("\n") + "\n", { mode: 0o600 });
    },
  };
}

async function main() {
  console.log("Seeding SACCO EVS database...\n");
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);
  const secretsFile = createSecretsFile();

  // --- Trustee pool -------------------------------------------------------
  // Private keys are generated here only because this is a local dev seed
  // script standing in for an out-of-band onboarding ceremony. In a real
  // deployment, each trustee generates their own keypair on their own
  // machine and only ever sends the server their public key.
  console.log(`Creating ${TRUSTEE_COUNT} trustees (credentials written to ${OUTPUT_FILE})...\n`);

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

    // A fixed, saved TOTP secret so this trustee is immediately usable
    // against a real authenticator app or otplib in a test script.
    const { generateSecret, generateURI } = await import("otplib");
    const totpSecret = generateSecret();
    await prisma.totpSecret.upsert({
      where: { userId: user.id },
      create: { userId: user.id, secret: totpSecret, enabled: true },
      update: { secret: totpSecret, enabled: true },
    });
    const otpauthUri = generateURI({ issuer: "SACCO EVS", label: email, secret: totpSecret });

    secretsFile.write(`--- ${email} ---`);
    secretsFile.write(`Password:         ${DEV_PASSWORD}`);
    secretsFile.write(`TOTP secret:      ${totpSecret}`);
    secretsFile.write(`TOTP otpauth URI: ${otpauthUri}`);
    secretsFile.write(`Private key (RSA-2048, PEM — NOT stored in the DB):`);
    secretsFile.write(privateKey);
    secretsFile.write("");

    console.log(`  created ${email}`);
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

    secretsFile.write(`${role} account: ${email} / ${DEV_PASSWORD} (no TOTP enrolled)`);
    console.log(`  created ${role.toLowerCase()} account: ${email}`);
  }

  secretsFile.close();
  console.log(`\nSeed complete. Credentials written to: ${OUTPUT_FILE}`);
  console.log("That file is gitignored — do not move its contents anywhere that gets committed or logged.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });