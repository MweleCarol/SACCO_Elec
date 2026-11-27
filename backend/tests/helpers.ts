// Shared factories and HTTP helpers for the test suite. Factories write
// straight to the database (fast, and lets a test put an election in any
// state, including a start date in the past). Behaviour under test always
// goes through the real HTTP API via Supertest.
import bcrypt from "bcrypt";
import crypto from "crypto";
import request from "supertest";
import { ElectionStatus, MembershipStatus, UserRole, UserStatus } from "@prisma/client";
import { createApp } from "../src/app";
import { prisma } from "../src/config/prisma";
import { signAccessToken } from "../src/shared/utils/jwt";

export const app = createApp();
export const api = () => request(app);

export const TEST_PASSWORD = "TestPass123";
// bcrypt cost 4 keeps the suite fast; the app's own hashing still uses 12.
const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 4);

let counter = 0;
const uniq = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

export async function createUser(
  role: UserRole,
  overrides: Partial<{
    email: string; fullName: string; status: UserStatus; membershipStatus: MembershipStatus;
    membershipNumber: string; mfaEnabled: boolean; totpSecret: string | null;
  }> = {}
) {
  const id = uniq();
  return prisma.user.create({
    data: {
      email: overrides.email ?? `${role.toLowerCase()}.${id}@test.local`,
      passwordHash: TEST_PASSWORD_HASH,
      role,
      status: overrides.status ?? "ACTIVE",
      fullName: overrides.fullName ?? `Test ${role} ${id}`,
      // Staff must have two-factor on to use staff routes, so staff test users
      // have it on unless a test says otherwise. (No secret: tests sign tokens
      // directly with bearer() and never type a code.)
      mfaEnabled: overrides.mfaEnabled ?? role !== "MEMBER",
      totpSecret: overrides.totpSecret ?? null,
      ...(role === "MEMBER"
        ? {
            membershipNumber: overrides.membershipNumber ?? `M-${id}`,
            membershipStatus: overrides.membershipStatus ?? "ACTIVE",
            branch: "Test Branch",
          }
        : {}),
    },
  });
}

// A valid access token without going through /auth/login (login itself is
// tested in auth.test.ts).
export function tokenFor(user: { id: string; role: UserRole }): string {
  return signAccessToken({ sub: user.id, role: user.role });
}

export const bearer = (user: { id: string; role: UserRole }) => ({ Authorization: `Bearer ${tokenFor(user)}` });

export async function createElection(
  createdById: string,
  overrides: Partial<{
    status: ElectionStatus; startDate: Date; endDate: Date; requiredApprovals: number; name: string; approvedAt: Date | null;
  }> = {}
) {
  const now = Date.now();
  return prisma.election.create({
    data: {
      name: overrides.name ?? `Election ${uniq()}`,
      startDate: overrides.startDate ?? new Date(now + 24 * 3600_000),
      endDate: overrides.endDate ?? new Date(now + 48 * 3600_000),
      status: overrides.status ?? "DRAFT",
      requiredApprovals: overrides.requiredApprovals ?? 2,
      approvedAt: overrides.approvedAt ?? null,
      createdById,
    },
  });
}

export async function createPosition(electionId: string, name = `Position ${uniq()}`, order = 0) {
  return prisma.position.create({ data: { electionId, name, order } });
}

export async function createCandidate(
  electionId: string, positionId: string, status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "WITHDRAWN" = "APPROVED",
  displayName = `Candidate ${uniq()}`
) {
  return prisma.candidate.create({ data: { electionId, positionId, displayName, status } });
}

// An election that is ACTIVE and inside its voting window, with two positions
// and two approved candidates each. Voting tests need this state, and it can't
// be reached through the API alone because creation requires a future start date.
// One position with one approved candidate: the minimum ballot on which
// voting may be opened (activation refuses anything less).
export async function addReadyBallot(electionId: string) {
  const position = await createPosition(electionId, "Chairperson", 0);
  const candidate = await createCandidate(electionId, position.id, "APPROVED", "Ready Candidate");
  return { position, candidate };
}

export async function createOpenElection(officerId: string, requiredApprovals = 2) {
  const now = Date.now();
  const election = await createElection(officerId, {
    status: "ACTIVE", startDate: new Date(now - 3600_000), endDate: new Date(now + 3600_000), requiredApprovals,
  });
  const chair = await createPosition(election.id, "Chairperson", 0);
  const treasurer = await createPosition(election.id, "Treasurer", 1);
  const [chairA, chairB] = [
    await createCandidate(election.id, chair.id, "APPROVED", "Alice"),
    await createCandidate(election.id, chair.id, "APPROVED", "Bob"),
  ];
  const [treasA, treasB] = [
    await createCandidate(election.id, treasurer.id, "APPROVED", "Carol"),
    await createCandidate(election.id, treasurer.id, "APPROVED", "Dan"),
  ];
  return { election, chair, treasurer, chairA, chairB, treasA, treasB };
}

export function randomTotpSecretPlain(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { authenticator } = require("otplib");
  return authenticator.generateSecret();
}

// Fire-and-forget work (notifications after commit) finishes shortly after the
// response. Poll instead of sleeping a fixed time.
export async function waitFor<T>(fn: () => Promise<T>, ok: (v: T) => boolean, timeoutMs = 3000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last = await fn();
  while (!ok(last) && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 50));
    last = await fn();
  }
  return last;
}

export const randomUuid = () => crypto.randomUUID();