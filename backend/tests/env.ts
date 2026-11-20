// Runs before every test file, BEFORE any application module is imported.
// It repoints the app at the test database. Without this the API under test
// used DATABASE_URL (your dev DB), and setup.ts would have wiped it.
import dotenv from "dotenv";

process.env.DOTENV_CONFIG_QUIET = "true";
dotenv.config({ quiet: true });

if (!process.env.DATABASE_TEST_URL) {
  throw new Error("DATABASE_TEST_URL is not set in .env. It is required to run tests (see .env.example).");
}
if (process.env.DATABASE_TEST_URL === process.env.DATABASE_URL) {
  throw new Error("DATABASE_TEST_URL must point at a different database from DATABASE_URL.");
}

process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;
process.env.NODE_ENV = "test";

// Tests log in many times from one IP. The limiter has its own test.
process.env.AUTH_RATE_LIMIT_MAX = process.env.TEST_AUTH_RATE_LIMIT_MAX ?? "10000";

// Tests must never call the real Gemini API.
delete process.env.GEMINI_API_KEY;