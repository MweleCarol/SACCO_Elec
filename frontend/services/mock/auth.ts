import { mockUsers } from "./members";
import type { Member } from "@/types/member";
import type { LoginPayload, RegisterPayload, AuthResult } from "@/types/auth";

const MOCK_DELAY_MS = 700;

// Simulates a delay for mock API responses
function delay<T>(value: T, ms = MOCK_DELAY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function mockLogin(payload: LoginPayload): Promise<AuthResult> {
  const member = mockUsers.find(
    (u) => u.email.toLowerCase() === payload.email.toLowerCase()
  );

  if (!member) {
    return delay({ success: false, message: "No account found with this email address." });
  }

  // Mock only — real backend verifies password with bcrypt and issues JWT + refresh tokens.
  if (payload.password.length < 6) {
    return delay({ success: false, message: "Incorrect password." });
  }

  return delay({ success: true, message: `Welcome back, ${member.name}.`, user: member });
}

export async function mockRegister(payload: RegisterPayload): Promise<AuthResult> {
  const existing = mockUsers.find(
    (u) =>
      u.email.toLowerCase() === payload.email.toLowerCase() ||
      u.membershipNumber === payload.membershipNumber
  );

  if (existing) {
    return delay({
      success: false,
      message: "An account with this membership number or email already exists.",
    });
  }

  const newMember: Member = {
    id: `usr-member-${Date.now()}`,
    name: payload.fullName,
    email: payload.email,
    membershipNumber: payload.membershipNumber,
    role: "MEMBER",
    branch: "Unassigned",
    mfaEnabled: false,
    isOnline: false,
    avatarUrl: "/mock/avatars/placeholder.jpg",
    createdAt: new Date().toISOString(),
  };

  return delay({
    success: true,
    message: "Registration submitted. You can now log in.",
    user: newMember,
  });
}

 