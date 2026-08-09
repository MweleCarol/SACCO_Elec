/**
 * One-time setup utility — generates the three secrets
 * key-management.service.ts requires at startup:
 *   - VOTE_ENCRYPTION_KEY   (32 random bytes, base64 — AES-256-GCM)
 *   - VOTE_SIGNING_PRIVATE_KEY / VOTE_SIGNING_PUBLIC_KEY (RSA-2048 PEM, base64-encoded)
 *
 * Run once per environment (dev, staging, prod each need their own —
 * NEVER reuse a key across environments, and never commit the output
 * anywhere near git). Prints to stdout only; does not write to .env
 * automatically, so you don't accidentally overwrite existing secrets
 * a second run of this script.
 *
 * Usage: npx ts-node scripts/generate-keys.ts
 */
import { randomBytes, generateKeyPairSync } from 'node:crypto';

function generateEncryptionKey(): string {
  return randomBytes(32).toString('base64'); // AES-256 = 32 bytes
}

function generateSigningKeyPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  return {
    privateKey: Buffer.from(privateKey).toString('base64'),
    publicKey: Buffer.from(publicKey).toString('base64'),
  };
}

function main(): void {
  const encryptionKey = generateEncryptionKey();
  const { privateKey, publicKey } = generateSigningKeyPair();

  console.log('\nGenerated secrets — paste into .env for this environment ONLY.\n');
  console.log('Never commit these. Never reuse across dev/staging/production.\n');
  console.log(`VOTE_ENCRYPTION_KEY=${encryptionKey}`);
  console.log(`VOTE_SIGNING_PRIVATE_KEY=${privateKey}`);
  console.log(`VOTE_SIGNING_PUBLIC_KEY=${publicKey}`);
  console.log('');
}

main();