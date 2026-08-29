import type { Config } from "jest";

// This is the Jest configuration for the backend tests. 
// It uses ts-jest to run TypeScript tests, sets the test environment to Node.js, and specifies the root directory and test file patterns. 
// It also includes setup files and clears mocks between.
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  clearMocks: true,
  // Jest tests hit a real Prisma test database (per LLD §19), so keep
  // them sequential — parallel test files would race on the same tables.
  maxWorkers: 1,
};

export default config;