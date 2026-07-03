import { createVerify } from "node:crypto";

/**
 * Verifies that `signatureBase64` is a valid RSA-SHA256 signature over
 * `payloadHash`, produced by the private key matching `publicKeyPem`.
 *
 * Trustee private keys are generated and held client-side (see HLD 8.2) —
 * the server only ever sees the public key (stored on the Trustee record)
 * and the signature submitted with each approval. It never has access to
 * a trustee's private key.
 */
export function verifyApprovalSignature(
  payloadHash: string,
  signatureBase64: string,
  publicKeyPem: string
): boolean {
  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(payloadHash);
    verifier.end();
    return verifier.verify(publicKeyPem, signatureBase64, "base64");
  } catch {
    // Malformed key or signature -> treat as invalid, never throw here.
    return false;
  }
}