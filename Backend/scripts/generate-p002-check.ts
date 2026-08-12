// scripts/generate-p2002-check.ts
//
// Throwaway diagnostic — NOT part of the application. Deliberately
// triggers a P2002 unique-constraint violation on User.email and logs
// the raw error.meta shape, so classifyUniqueConflict() in
// users.repository.ts can be verified against reality instead of
// guessed a third time. Delete after running once.
//
// Usage: npx ts-node scripts/generate-p2002-check.ts
import { prisma } from '../src/database/client';

async function main(): Promise<void> {
  const email = `p2002-check-${Date.now()}@example.com`;

  // Need a real roleId to satisfy the FK — grab any seeded role.
  const role = await prisma.role.findFirst({ select: { id: true } });
  if (!role) {
    throw new Error('No roles seeded — run prisma/seed.ts first.');
  }

  await prisma.user.create({
    data: { email, fullName: 'P2002 Check', passwordHash: null, status: 'PENDING_ACTIVATION', roleId: role.id },
  });

  try {
    await prisma.user.create({
      data: { email, fullName: 'P2002 Check Duplicate', passwordHash: null, status: 'PENDING_ACTIVATION', roleId: role.id },
    });
    console.log('No error thrown — something is wrong, this insert should have violated the unique constraint.');
  } catch (err) {
    console.log('Raw error.meta shape:');
    console.log(JSON.stringify((err as { meta?: unknown }).meta, null, 2));
  } finally {
    // Clean up the row(s) this script created.
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});