import { PrismaClient, UserRole, MembershipStatus } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function generatePassword(): string {
  return crypto.randomBytes(12).toString("base64url");
}

interface SeedAccount {
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
  {
    role: "ELECTION_OFFICER",
    email: "officer.seed@sevs.local",
    fullName: "Seed Officer",
  },
  {
    role: "ELECTION_ADMINISTRATOR",
    email: "admin.seed@sevs.local",
    fullName: "Seed Administrator",
  },
  {
    role: "AUDITOR",
    email: "auditor.seed@sevs.local",
    fullName: "Seed Auditor",
  },
];

// Simulates two members whom membership-sync has already created (real
// membership data present) but who have never registered a login yet —
// this is what /auth/register needs to find and "activate." Not part of
// ACCOUNTS above because these deliberately get NO usable password.
const PENDING_MEMBERS = [
  { membershipNumber: "SACCO-0002", nationalId: "00000002", fullName: "Pending Member One", email: "pending1.seed@sevs.local", branch: "Head Office" },
  { membershipNumber: "SACCO-0003", nationalId: "00000003", fullName: "Pending Member Two", email: "pending2.seed@sevs.local", branch: "Westlands Branch" },
];

async function main(): Promise<void> {
  const credentials: Record<string, { email: string; password: string; role: string }> = {};

  for (const account of ACCOUNTS) {
    await prisma.user.deleteMany({ where: { email: account.email } });

    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: account.email,
        passwordHash,
        role: account.role,
        fullName: account.fullName,
        ...account.membershipFields,
      },
    });

    credentials[account.role] = { email: user.email, password, role: account.role };
  }

  for (const pending of PENDING_MEMBERS) {
    await prisma.user.deleteMany({ where: { membershipNumber: pending.membershipNumber } });

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

  const outputPath = path.join(__dirname, "seed-credentials.json");
  fs.writeFileSync(outputPath, JSON.stringify(credentials, null, 2), "utf-8");

  console.log(`✅ Seeded ${ACCOUNTS.length} accounts (one per role).`);
  console.log(`✅ Also seeded ${PENDING_MEMBERS.length} PENDING_ACTIVATION members for testing /auth/register.`);
  console.log(`   Credentials written to: ${outputPath}`);
  console.log(`   ⚠️  Gitignored — don't commit it, and these passwords are for local dev login only.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });