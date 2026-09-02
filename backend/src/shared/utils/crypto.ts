import crypto from "crypto";
import { env } from "../../config/env";

const ALGORITHM = "aes-256-gcm";
const encryptionKey = Buffer.from(env.ENCRYPTION_KEY, "hex"); // 32 bytes, validated at startup by env.ts

// Format: iv:authTag:ciphertext, all hex, colon-separated — self-contained,
// so decryption never needs anything beyond this one stored string plus
// the app's key.
export function encryptPayload(plaintext: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV, standard for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptPayload(stored: string): string {
  const [ivHex, authTagHex, ciphertextHex] = stored.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Malformed encrypted payload.");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}