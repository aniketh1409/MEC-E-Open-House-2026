/**
 * Sets the password for the /qr-codes page in src/data/event.json (as a fingerprint).
 * Once the Google Sheet is connected, change it on the sheet's Event tab instead.
 *
 *     npm run qr:password -- "new password"
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hashQrPassword } from "./password.mjs";

const password = process.argv.slice(2).join(" ").trim();
if (password.length < 8) {
  console.error('Give a password of at least 8 characters: npm run qr:password -- "new password"');
  process.exit(1);
}

const path = join(resolve(dirname(fileURLToPath(import.meta.url)), "../.."), "src/data/event.json");
const raw = readFileSync(path, "utf8");
const event = JSON.parse(raw);
event.qrPagePasswordHash = hashQrPassword(password);
writeFileSync(path, `${JSON.stringify(event, null, 2)}\n`.replace(/\n/g, raw.includes("\r\n") ? "\r\n" : "\n"));
console.log("QR codes page password updated in src/data/event.json. Commit and deploy for it to take effect.");
