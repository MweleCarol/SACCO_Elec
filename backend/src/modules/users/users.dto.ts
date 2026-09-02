import { User } from "@prisma/client";
import { SafeUserDto } from "../auth/auth.dto";

// Reuses the same "safe" shape auth.dto.ts already defines — one
// definition of "what a User looks like to a client" for the whole
// codebase, rather than a second, possibly-drifting copy here.
export function toSafeUserDto(user: User): SafeUserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    mfaEnabled: user.mfaEnabled,
    membershipNumber: user.membershipNumber,
  };
}

export interface PaginatedUsersDto {
  users: SafeUserDto[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}