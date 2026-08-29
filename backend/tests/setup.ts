import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env";

if (!env.DATABASE_TEST_URL) {
  throw new Error(
    "DATABASE_TEST_URL is not set in .env — required to run tests. See .env.example."
  );
}

// A separate client from the app's singleton in src/config/prisma.ts,
// pointed explicitly at the test database. This is what actually
// guarantees a test run can never touch your dev data, even if some
// future test file forgets and imports the wrong prisma client.
export const testPrisma = new PrismaClient({
  datasources: { db: { url: env.DATABASE_TEST_URL } },
});

// One TRUNCATE with CASCADE handles foreign-key ordering automatically —
// no need to list tables child-before-parent. Update this list if a
// future migration adds a table.
const ALL_TABLES = [
  "AIInsight", "Notification", "AuditLog", "Result", "ApprovalDecision",
  "ApprovalRequest", "Vote", "Participation", "Candidate", "Position",
  "Election", "RefreshToken", "User",
];

export async function resetTestDatabase(): Promise<void> {
  const tableList = ALL_TABLES.map((t) => `"${t}"`).join(", ");
  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
}

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});