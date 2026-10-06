/**
 * The QR codes page password is stored only as a salted SHA-256 fingerprint, so the password
 * itself never appears in the website's files. The page hashes what's typed the same way.
 *
 *     npm run qr:password -- "new password"     # sets it in src/data/event.json
 */
import { createHash } from "node:crypto";

/** Must match src/lib/qrPassword.ts. */
export const QR_PASSWORD_SALT = "mece-open-house-qr-page:";

export function hashQrPassword(password) {
  return createHash("sha256").update(QR_PASSWORD_SALT + password.trim()).digest("hex");
}
