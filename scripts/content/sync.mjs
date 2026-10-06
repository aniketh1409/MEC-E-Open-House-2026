/**
 * Pulls event content from the Google Sheet (or a local .xlsx), checks it, and writes src/data.
 * Nothing is written unless every check passes, so a bad edit never reaches the site.
 *
 *     npm run content:sync -- --file content/open-house-content.xlsx   # from a local file
 *     CONTENT_SHEET_ID=... npm run content:sync                        # from Google Sheets
 *
 * Runs before every build (`prebuild`) with --if-configured: it does nothing unless
 * CONTENT_SHEET_ID is set, so local builds and tests use the committed JSON.
 *
 * Google access, either:
 *  - share the sheet as "Anyone with the link can view" (no other setup), or
 *  - keep it private, share it with a Google service account, and set GOOGLE_SERVICE_ACCOUNT_JSON
 *    to that account's key (the whole JSON).
 */
import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readData, writeData } from "./dataFiles.mjs";
import { fromSheet } from "./sheetFormat.mjs";
import { validateSheet } from "./validate.mjs";
import { readWorkbook } from "./workbook.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/** OAuth token for a service account (JWT bearer flow), read-only access to Drive. */
async function serviceAccountToken(keyJson) {
  const key = JSON.parse(keyJson);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: key.client_email, scope: "https://www.googleapis.com/auth/drive.readonly", aud: key.token_uri, iat: now, exp: now + 3600 }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(key.private_key);
  const response = await fetch(key.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${base64url(signature)}`,
    }),
  });
  if (!response.ok) throw new Error(`Google sign-in for the service account failed (${response.status}): ${await response.text()}`);
  return (await response.json()).access_token;
}

async function downloadSheet(sheetId) {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const response = keyJson
    ? await fetch(`https://www.googleapis.com/drive/v3/files/${sheetId}/export?mimeType=${encodeURIComponent(XLSX)}`, {
        headers: { Authorization: `Bearer ${await serviceAccountToken(keyJson)}` },
      })
    : await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`, { redirect: "follow" });
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || type.includes("text/html")) {
    throw new Error(
      `Couldn't download the content sheet (HTTP ${response.status}). Check CONTENT_SHEET_ID, and that the sheet is shared as ` +
        `"Anyone with the link can view" or with the service account in GOOGLE_SERVICE_ACCOUNT_JSON.`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const file = option("--file");
  const sheetId = process.env.CONTENT_SHEET_ID?.trim();
  if (!file && !sheetId) {
    if (args.includes("--if-configured")) {
      console.log("Content sheet: not configured (CONTENT_SHEET_ID unset), using the committed src/data files.");
      return;
    }
    throw new Error("Give --file path/to/sheet.xlsx or set CONTENT_SHEET_ID.");
  }

  const buffer = file ? readFileSync(resolve(file)) : await downloadSheet(sheetId);
  const { sheet, errors } = await readWorkbook(buffer);
  const current = readData(root);
  if (errors.length === 0) errors.push(...validateSheet(sheet, root, current));

  if (errors.length > 0) {
    console.error(`\nThe content sheet has ${errors.length} problem${errors.length === 1 ? "" : "s"}. Nothing was changed on the website:\n`);
    for (const error of errors) console.error(`  • ${error}`);
    console.error("\nFix these and publish again. Checks between tabs run once every cell reads correctly.\n");
    process.exit(1);
  }

  const changed = writeData(root, fromSheet(sheet));
  console.log(changed.length ? `Content sheet: updated ${changed.map((name) => `${name}.json`).join(", ")}.` : "Content sheet: no changes.");
}

main().catch((error) => {
  console.error(`\nContent sheet: ${error.message}\n`);
  process.exit(1);
});
