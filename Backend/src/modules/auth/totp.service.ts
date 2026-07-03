import { generateSecret, verify, generateURI } from "otplib";

const ISSUER = "SACCO EVS";

export interface TotpEnrollment {
  secret: string;
  otpauthUri: string;
}

/** Generates a new Base32 TOTP secret and an otpauth:// URI for QR provisioning. */
export function enrollTotp(accountEmail: string): TotpEnrollment {
  const secret = generateSecret();
  const otpauthUri = generateURI({
    issuer: ISSUER,
    label: accountEmail,
    secret,
  });
  return { secret, otpauthUri };
}

/** Verifies a 6-digit code against a stored Base32 secret. */
export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  const result = await verify({ secret, token: code });
  return result.valid;
}