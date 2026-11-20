// Plain JavaScript on purpose: a jest.config.ts needs ts-node installed,
// which this project does not have, so `npm test` could not start.
/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  // env.ts runs before any app module loads and repoints DATABASE_URL at the
  // test database; setup.ts then truncates every table before each test.
  setupFiles: ["<rootDir>/tests/env.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000,
  // Tests share one database, so test files must run one at a time.
  maxWorkers: 1,
};