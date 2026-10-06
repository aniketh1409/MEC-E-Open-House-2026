/** Must match scripts/content/password.mjs. */
const QR_PASSWORD_SALT = "mece-open-house-qr-page:";

/** Salted SHA-256 fingerprint of a password, as hex. */
export async function hashQrPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(QR_PASSWORD_SALT + password.trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
