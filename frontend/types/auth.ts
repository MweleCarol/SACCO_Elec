import type { Member } from "./member";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  membershipNumber: string;
  email: string;
  fullName: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  message: string;
  user?: Member;
}