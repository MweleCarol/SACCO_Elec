// scripts/generate-p002-check.ts
//
// Throwaway diagnostic — NOT part of the application. Deliberately
// triggers a P2002 unique-constraint violation on User.email and logs
// the raw error.meta shape, so classifyUniqueConflict() in
// users.repository.ts can be verified against reality instead of
// guessed a third time. Delete after running once.
//
// Usage: npx ts-node -r tsconfig-paths/register scripts/generate-p002-check.ts
//
// SAFETY: writes real rows to whatever DATABASE_URL points at. Refuses
// to run against NODE_ENV=production, and requires an explicit
// confirmation env var so it can never be run unattended or by
// accident against a database that isn't a disposable dev/diagnostic
// instance.
import { Prisma } from '../src/generated/prisma/client';
import { prisma } from '../src/database/client';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run diagnostic script against NODE_ENV=production.');
  }
  if (process.env.CONFIRM_DIAGNOSTIC_DB_WRITE !== 'yes') {
    throw new Error(
      'This script writes and deletes real rows. Set CONFIRM_DIAGNOSTIC_DB_WRITE=yes ' +
        '(and only against a disposable dev/diagnostic database) to proceed.',
    );
  }

  const email = `p2002-check-${Date.now()}@example.com`;

  // Need a real roleId to satisfy the FK — grab any seeded role.
  const role = await prisma.role.findFirst({ select: { id: true } });
  if (!role) {
    throw new Error('No roles seeded — run prisma/seed.ts first.');
  }

  // Both inserts live inside the try block now, not just the second —
  // if anything after the first insert throws or the process is
  // interrupted, the finally block still fires and cleans up the row
  // instead of leaving a diagnostic row behind.
  try {
    await prisma.user.create({
      data: { email, fullName: 'P2002 Check', passwordHash: null, status: 'PENDING_ACTIVATION', roleId: role.id },
    });

    await prisma.user.create({
      data: { email, fullName: 'P2002 Check Duplicate', passwordHash: null, status: 'PENDING_ACTIVATION', roleId: role.id },
    });

    // Reaching here means the unique constraint didn't fire at all —
    // that's not a benign outcome, it means the constraint is missing
    // or broken. Throw so the script exits nonzero and this can't be
    // mistaken for a successful run in CI or a quick glance at output.
    throw new Error(
      'Second insert succeeded — unique constraint on User.email is missing or not enforced.',
    );
  } catch (err) {
    // Only the expected P2002 gets the diagnostic treatment. Anything
    // else (DB connection lost, a different constraint, the error we
    // just threw above for a missing constraint) rethrows untouched —
    // silently logging meta for an unrelated error would be actively
    // misleading about what was actually verified.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      console.log('Raw error.meta shape:');
      console.log(JSON.stringify(err.meta, null, 2));
    } else {
      throw err;
    }
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