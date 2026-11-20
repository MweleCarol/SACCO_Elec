import { prisma } from "../src/config/prisma";

// tests/env.ts has already pointed DATABASE_URL at DATABASE_TEST_URL, so the
// app's own Prisma singleton is the test-database client.
if (process.env.DATABASE_URL !== process.env.DATABASE_TEST_URL) {
  throw new Error("Refusing to run: the app is not pointed at DATABASE_TEST_URL.");
}

// Update this list if a future migration adds a table.
const ALL_TABLES = [
  "AIInsight", "Notification", "AuditLog", "Result", "ApprovalDecision",
  "ApprovalRequest", "Vote", "Participation", "Candidate", "Position",
  "Election", "RefreshToken", "User",
];

export async function resetTestDatabase(): Promise<void> {
  const tableList = ALL_TABLES.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`);
}

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});