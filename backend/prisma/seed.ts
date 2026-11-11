import { PrismaClient, UserRole, MembershipStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const CREDENTIALS_PATH = path.join(__dirname, "seed-credentials.json");

// npm run prisma:seed -- --reset   rotates the passwords of existing seed accounts
const RESET_PASSWORDS = process.argv.includes("--reset");

type Credentials = Record<string, { email: string; password: string; role: string }>;

function generatePassword(): string {
  return crypto.randomBytes(12).toString("base64url");
}

function loadCredentials(): Credentials {
  try {
    return JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8")) as Credentials;
  } catch {
    return {};
  }
}

interface SeedAccount {
  key: string; // the entry name in seed-credentials.json
  role: UserRole;
  email: string;
  fullName: string;
  membershipFields?: {
    membershipNumber: string;
    nationalId: string;
    branch: string;
    membershipStatus: MembershipStatus;
  };
}

const ACCOUNTS: SeedAccount[] = [
  {
    key: "MEMBER",
    role: "MEMBER",
    email: "member.seed@sevs.local",
    fullName: "Seed Member",
    membershipFields: {
      membershipNumber: "SACCO-0001",
      nationalId: "00000001",
      branch: "Head Office",
      membershipStatus: "ACTIVE",
    },
  },
  { key: "ELECTION_OFFICER", role: "ELECTION_OFFICER", email: "officer.seed@sevs.local", fullName: "Seed Officer" },
  { key: "ELECTION_OFFICER_2", role: "ELECTION_OFFICER", email: "officer2.seed@sevs.local", fullName: "Seed Officer Two" },
  { key: "ELECTION_OFFICER_3", role: "ELECTION_OFFICER", email: "officer3.seed@sevs.local", fullName: "Seed Officer Three" },
  { key: "ELECTION_ADMINISTRATOR", role: "ELECTION_ADMINISTRATOR", email: "admin.seed@sevs.local", fullName: "Seed Administrator" },
  { key: "AUDITOR", role: "AUDITOR", email: "auditor.seed@sevs.local", fullName: "Seed Auditor" },
];

// Members the membership sync would already have created but who have never
// registered a login. /auth/register needs to find and activate these.
const PENDING_MEMBERS = [
  { membershipNumber: "SACCO-0002", nationalId: "00000002", fullName: "Pending Member One", email: "pending1.seed@sevs.local", branch: "Head Office" },
  { membershipNumber: "SACCO-0003", nationalId: "00000003", fullName: "Pending Member Two", email: "pending2.seed@sevs.local", branch: "Westlands Branch" },
];

async function main(): Promise<void> {
  // Merge into the existing file so passwords for accounts that already exist
  // are kept.
  const credentials = loadCredentials();
  const created: string[] = [];
  const reset: string[] = [];
  const skipped: string[] = [];

  for (const account of ACCOUNTS) {
    const existing = await prisma.user.findUnique({ where: { email: account.email } });

    if (existing && !RESET_PASSWORDS) {
      skipped.push(account.email);
      continue;
    }

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    if (existing) {
      // Never delete: audit rows reference this account. Rotate the password
      // by update and end every session it already has.
      await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } });
      await prisma.refreshToken.updateMany({
        where: { userId: existing.id, revoked: false },
        data: { revoked: true, revokedAt: new Date() },
      });
      reset.push(account.email);
    } else {
      await prisma.user.create({
        data: {
          email: account.email,
          passwordHash,
          role: account.role,
          fullName: account.fullName,
          ...account.membershipFields,
        },
      });
      created.push(account.email);
    }

    credentials[account.key] = { email: account.email, password, role: account.role };
  }

  for (const pending of PENDING_MEMBERS) {
    const existing = await prisma.user.findUnique({ where: { membershipNumber: pending.membershipNumber } });
    if (existing) continue;

    // Never-usable placeholder: no password anyone types will match this hash.
    const unusableHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

    await prisma.user.create({
      data: {
        email: pending.email,
        passwordHash: unusableHash,
        role: "MEMBER",
        status: "PENDING_ACTIVATION",
        fullName: pending.fullName,
        membershipNumber: pending.membershipNumber,
        nationalId: pending.nationalId,
        branch: pending.branch,
        membershipStatus: "ACTIVE",
      },
    });
  }

  fs.writeFileSync(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2), "utf-8");

  console.log(`Created: ${created.length}${created.length ? " (" + created.join(", ") + ")" : ""}`);
  console.log(`Password reset: ${reset.length}${reset.length ? " (" + reset.join(", ") + ")" : ""}`);
  console.log(`Already existed, left unchanged: ${skipped.length}`);
  console.log(`Credentials file: ${CREDENTIALS_PATH}`);
  console.log("It is gitignored. Do not commit it. These passwords are for local dev only.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });