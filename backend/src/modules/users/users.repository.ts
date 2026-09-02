import { prisma } from "../../config/prisma";
import { Prisma, User, UserRole, UserStatus } from "@prisma/client";

export function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export interface ListUsersFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page: number;
  pageSize: number;
}

export async function listUsers(
  filters: ListUsersFilters
): Promise<{ users: User[]; totalCount: number }> {
  const where: Prisma.UserWhereInput = {
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { email: { contains: filters.search, mode: "insensitive" } },
            { fullName: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, totalCount] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, totalCount };
}

// Used only for the "self-service" update path — email/phoneNumber only,
// enforced at the caller (users.service.ts) by which fields it passes in,
// not by this function's signature. Kept as a separate function from
// adminUpdateUser below rather than one generic "updateUser" so that a
// future accidental call site can't slip a synced field or a role change
// through the member-facing path just by passing extra keys.
export function updateOwnProfile(
  userId: string,
  data: { email?: string; phoneNumber?: string }
): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data });
}

export function adminUpdateUser(
  userId: string,
  data: { email?: string; phoneNumber?: string; role?: UserRole; status?: UserStatus }
): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data });
}

export function createAdminAccount(data: {
  email: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
}): Promise<User> {
  return prisma.user.create({
    data: {
      email: data.email,
      fullName: data.fullName,
      role: data.role,
      passwordHash: data.passwordHash,
      status: "ACTIVE",
    },
  });
}