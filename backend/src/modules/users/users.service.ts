import bcrypt from "bcrypt";
import crypto from "crypto";
import { User } from "@prisma/client";
import { ForbiddenError } from "../../shared/errors/ForbiddenError";
import { ValidationError } from "../../shared/errors/ValidationError";
import { NotFoundError } from "../../shared/errors/NotFoundError";
import { writeAuditLog } from "../audit/audit.service";
import * as usersRepository from "./users.repository";
import { toSafeUserDto, PaginatedUsersDto } from "./users.dto";
import {
  UpdateOwnProfileInput, AdminUpdateUserInput, CreateAdminAccountInput, ListUsersQuery,
} from "./users.schema";
import { SafeUserDto } from "../auth/auth.dto";

export async function getOwnProfile(userId: string): Promise<SafeUserDto> {
  const user = await usersRepository.findUserById(userId);
  if (!user) throw new NotFoundError("User");
  return toSafeUserDto(user);
}

export async function updateOwnProfile(
  userId: string,
  input: UpdateOwnProfileInput
): Promise<SafeUserDto> {
  if (input.email) {
    const existing = await usersRepository.findUserByEmail(input.email);
    if (existing && existing.id !== userId) {
      throw new ValidationError([{ field: "email", message: "This email address is already in use." }]);
    }
  }

  // Only email/phoneNumber ever reach this function's `input` type at all
  // (see UpdateOwnProfileInput in users.schema.ts) — there is no field a
  // MEMBER could pass here that would touch membershipNumber, nationalId,
  // branch, membershipStatus, fullName, or role, even if the request body
  // contained extra keys, since Zod's schema strips anything not declared.
  const updated = await usersRepository.updateOwnProfile(userId, input);

  await writeAuditLog({
    actorId: userId,
    action: "PROFILE_UPDATED",
    resourceType: "User",
    resourceId: userId,
    outcome: "SUCCESS",
  });

  return toSafeUserDto(updated);
}

export async function listUsers(query: ListUsersQuery): Promise<PaginatedUsersDto> {
  const { users, totalCount } = await usersRepository.listUsers({
    role: query.role,
    status: query.status,
    search: query.search,
    page: query.page,
    pageSize: query.pageSize,
  });

  return {
    users: users.map(toSafeUserDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / query.pageSize),
    },
  };
}

export async function adminUpdateUser(
  actingAdminId: string,
  targetUserId: string,
  input: AdminUpdateUserInput
): Promise<SafeUserDto> {
  const target = await usersRepository.findUserById(targetUserId);
  if (!target) throw new NotFoundError("User");

  // Prevents an administrator from changing their OWN role/status through
  // this endpoint — closes off both accidental self-lockout (setting your
  // own status to SUSPENDED) and, more importantly, using this as a
  // laundering path for privilege changes that should go through a
  // separate, more deliberate process if ever needed. They can still
  // update their own email/phoneNumber via /users/me instead.
  if (targetUserId === actingAdminId && (input.role !== undefined || input.status !== undefined)) {
    throw new ForbiddenError("You cannot change your own role or status.");
  }

  if (input.email) {
    const existing = await usersRepository.findUserByEmail(input.email);
    if (existing && existing.id !== targetUserId) {
      throw new ValidationError([{ field: "email", message: "This email address is already in use." }]);
    }
  }

  const updated = await usersRepository.adminUpdateUser(targetUserId, input);

  await writeAuditLog({
    actorId: actingAdminId,
    action: "USER_UPDATED_BY_ADMIN",
    resourceType: "User",
    resourceId: targetUserId,
    outcome: "SUCCESS",
    metadata: { changedFields: Object.keys(input) }, // field names only — never values, in case email/phone count as borderline-sensitive to log verbatim
  });

  return toSafeUserDto(updated);
}

export interface CreatedAdminAccountDto {
  user: SafeUserDto;
  // Returned exactly once, in this response only — never stored,
  // logged, or retrievable again afterward. The administrator creating
  // the account is responsible for conveying it to the new officer/
  // auditor through some out-of-band channel (in person, a call) until
  // the Notifications module (Phase 9) can deliver it via email instead.
  temporaryPassword: string;
}

export async function createAdminAccount(
  actingAdminId: string,
  input: CreateAdminAccountInput
): Promise<CreatedAdminAccountDto> {
  const existing = await usersRepository.findUserByEmail(input.email);
  if (existing) {
    throw new ValidationError([{ field: "email", message: "This email address is already in use." }]);
  }

  const temporaryPassword = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const user = await usersRepository.createAdminAccount({
    email: input.email,
    fullName: input.fullName,
    role: input.role,
    passwordHash,
  });

  await writeAuditLog({
    actorId: actingAdminId,
    action: "ADMIN_ACCOUNT_CREATED",
    resourceType: "User",
    resourceId: user.id,
    outcome: "SUCCESS",
    metadata: { role: input.role },
  });

  return { user: toSafeUserDto(user), temporaryPassword };
}