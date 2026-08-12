import 'dotenv/config';
import { PrismaClient, UserStatus } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { config } from '../src/config/index';

const adapter = new PrismaPg({
  connectionString: config.database.url,
});

const prisma = new PrismaClient({ adapter });

const ROLES = [
  'SYSTEM_ADMIN',
  'ELECTION_OFFICER',
  'VERIFICATION_OFFICER',
  'MEMBER',
  'AUDITOR',
  'OBSERVER',
] as const;

async function seedRoles(): Promise<Record<string, string>> {
  console.log('Seeding roles...');

  const roleMap: Record<string, string> = {};

  for (const roleName of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
    roleMap[roleName] = role.id;
    console.log(`  ok Role: ${roleName}`);
  }

  return roleMap;
}

/**
 * Generates a random password meeting the LLD Section 7.5 minimum (8+ chars,
 * complexity enforced) when SEED_ADMIN_PASSWORD isn't set - so a real
 * secret is never required to be typed into this file, and a forgotten
 * .env var fails loudly (printed once, here) rather than silently
 * seeding a guessable default.
 */
function generateBootstrapPassword(): string {
  return crypto.randomBytes(18).toString('base64url'); // 24 chars, safe for CLI/terminal display
}

async function seedAdminUser(adminRoleId: string): Promise<void> {
  console.log('Seeding admin user...');

  const email = process.env.SEED_ADMIN_EMAIL;
  if (!email) {
    throw new Error('SEED_ADMIN_EMAIL is not set in .env - refusing to seed an admin without one.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`  ok Admin user already exists: ${email} (skipping password reset)`);
    return;
  }

  // || not ?? deliberately: SEED_ADMIN_PASSWORD='' (present but empty, e.g.
  // an unfilled .env template value) must also fall through to the
  // generator. ?? only catches null/undefined — an empty string would
  // silently pass through as the "password," which is exactly the bug
  // this line previously had.
  const rawPassword = process.env.SEED_ADMIN_PASSWORD || generateBootstrapPassword();
  const passwordHash = await bcrypt.hash(rawPassword, config.security.bcryptRounds);

  await prisma.user.create({
    data: {
      email,
      fullName: process.env.SEED_ADMIN_FULL_NAME ?? 'System Administrator',
      passwordHash,
      status: UserStatus.ACTIVE,
      roleId: adminRoleId,
    },
  });

  console.log(`  ok Admin user: ${email}`);
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.log(`  WARNING Generated password (shown once, not stored anywhere): ${rawPassword}`);
  }
  console.log('  WARNING This role requires TOTP enrollment - complete setup immediately after first login.');
}

async function main(): Promise<void> {
  console.log('\n Starting SEVS database seed...\n');

  const roleMap = await seedRoles();
  await seedAdminUser(roleMap['SYSTEM_ADMIN']);

  console.log('\n Seed complete\n');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });