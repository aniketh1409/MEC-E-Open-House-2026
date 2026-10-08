/**
 * Prize draw entries for the MEC E Open House website.
 *
 * Lives in the organizers' private "Prize draw entries" Google Sheet (Extensions > Apps Script).
 * Deployed as a web app so the website can send entries; it can only add or update rows and never
 * returns the sheet's contents. Setup steps: content/README.md, "Prize draw".
 *
 * Script properties (Project Settings > Script properties):
 *   CLOSES_AT          when entries close, with time zone, e.g. 2026-10-17T15:00:00-06:00
 *   REQUIRED_STICKERS  stickers needed to enter (default 16)
 *   GRACE_MINUTES      how long after closing an entry made on time (but sent late, e.g. after
 *                      a dead zone) is still accepted (default 60)
 */

const ENTRIES_TAB = "Entries";
const HEADERS = [
  "Submitted",
  "Last updated",
  "Full name",
  "Email",
  "Entry code",
  "Passport ID",
  "Stickers",
  "First sticker",
  "Last sticker",
  "Minutes to complete",
  "Flags",
];
const COLUMN = Object.fromEntries(HEADERS.map((header, index) => [header, index]));
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Collecting every sticker faster than this is flagged for the organizers to look at. */
const FAST_MINUTES = 15;
/** Entries accepted per minute across everyone, to blunt automated spam. */
const MAX_PER_MINUTE = 120;

/** Short code shown to the visitor and in the sheet, derived from the passport ID. */
function entryCode_(passportId) {
  const hex = String(passportId).replace(/[^0-9a-f]/gi, "").toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

/**
 * Checks one entry. Returns { ok: true, entry } or { ok: false, error } with a message for the visitor.
 * Bot-trap hits return { ok: true, ignored: true } so bots get no signal.
 */
function checkEntry_(payload, config, nowMs) {
  if (!payload || typeof payload !== "object") return { ok: false, error: "Something went wrong. Please try again." };
  if (payload.website) return { ok: true, ignored: true };

  const name = String(payload.name ?? "").trim().replace(/\s+/g, " ");
  const email = String(payload.email ?? "").trim().toLowerCase();
  const passportId = String(payload.passportId ?? "").trim();
  const stickers = Number(payload.stickers);

  if (name.length < 2 || name.length > 100) return { ok: false, error: "Please enter your full name." };
  if (!EMAIL_PATTERN.test(email) || email.length > 254) return { ok: false, error: "Please enter a valid email address." };
  if (payload.consent !== true) return { ok: false, error: "Please agree to the terms to enter." };
  if (passportId.length < 8 || passportId.length > 100) return { ok: false, error: "Something went wrong. Please try again." };
  if (!(stickers >= config.requiredStickers)) {
    return { ok: false, error: `Collect all ${config.requiredStickers} stickers to enter the draw.` };
  }

  const submittedMs = Date.parse(payload.submittedAt);
  const onTime =
    nowMs <= config.closesAtMs ||
    (Number.isFinite(submittedMs) && submittedMs <= config.closesAtMs && nowMs <= config.closesAtMs + config.graceMinutes * 60000);
  if (!onTime) return { ok: false, error: "Sorry, the prize draw has closed." };

  const first = Date.parse(payload.firstStickerAt);
  const last = Date.parse(payload.lastStickerAt);
  const flags = [];
  let minutes = "";
  if (Number.isFinite(first) && Number.isFinite(last)) {
    minutes = Math.round((last - first) / 60000);
    if (minutes < FAST_MINUTES) flags.push(`All stickers in ${minutes} min`);
  } else {
    flags.push("No sticker times");
  }

  return {
    ok: true,
    entry: {
      name,
      email,
      passportId,
      code: entryCode_(passportId),
      stickers,
      firstStickerAt: Number.isFinite(first) ? new Date(first).toISOString() : "",
      lastStickerAt: Number.isFinite(last) ? new Date(last).toISOString() : "",
      minutes,
      flags,
    },
  };
}

/**
 * Adds or updates the entry in `rows` (the data rows, without the header). One row per passport:
 * entering again updates the name/email (so a typo can be fixed), and an email already used by a
 * different passport is refused. Returns { rows, status: "created" | "updated" } or { error }.
 */
function upsertEntry_(rows, entry, nowIso) {
  const sameEmail = rows.find((row) => String(row[COLUMN.Email]).toLowerCase() === entry.email && row[COLUMN["Passport ID"]] !== entry.passportId);
  if (sameEmail) return { error: "This email is already entered in the draw." };

  const values = (submitted) => [
    submitted,
    nowIso,
    entry.name,
    entry.email,
    entry.code,
    entry.passportId,
    entry.stickers,
    entry.firstStickerAt,
    entry.lastStickerAt,
    entry.minutes,
    entry.flags.join("; "),
  ];
  const index = rows.findIndex((row) => row[COLUMN["Passport ID"]] === entry.passportId);
  if (index >= 0) {
    const next = rows.slice();
    next[index] = values(rows[index][COLUMN.Submitted]);
    return { rows: next, status: "updated", index };
  }
  return { rows: [...rows, values(nowIso)], status: "created", index: rows.length };
}

// ---------- Google Apps Script entry points ----------

function config_() {
  const properties = PropertiesService.getScriptProperties();
  const closesAtMs = Date.parse(properties.getProperty("CLOSES_AT") || "");
  return {
    closesAtMs: Number.isFinite(closesAtMs) ? closesAtMs : 0,
    requiredStickers: Number(properties.getProperty("REQUIRED_STICKERS") || 16),
    graceMinutes: Number(properties.getProperty("GRACE_MINUTES") || 60),
  };
}

function json_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function entriesSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(ENTRIES_TAB) || spreadsheet.insertSheet(ENTRIES_TAB);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

/** Quick check that the web app is up: open its URL in a browser. */
function doGet() {
  const config = config_();
  return json_({ ok: true, open: Date.now() <= config.closesAtMs, closesAt: new Date(config.closesAtMs).toISOString() });
}

function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (error) {
    return json_({ ok: false, error: "Something went wrong. Please try again." });
  }

  const cache = CacheService.getScriptCache();
  const minuteKey = `rate-${Math.floor(Date.now() / 60000)}`;
  const count = Number(cache.get(minuteKey) || 0);
  if (count >= MAX_PER_MINUTE) return json_({ ok: false, error: "Lots of entries right now. Please try again in a minute." });
  cache.put(minuteKey, String(count + 1), 120);

  const checked = checkEntry_(payload, config_(), Date.now());
  if (!checked.ok || checked.ignored) return json_(checked.ok ? { ok: true, status: "created" } : checked);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = entriesSheet_();
    const lastRow = sheet.getLastRow();
    const rows = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues() : [];
    const result = upsertEntry_(rows, checked.entry, new Date().toISOString());
    if (result.error) return json_({ ok: false, error: result.error });
    // Only the changed row is written back. Text format keeps codes and emails exactly as typed.
    const range = sheet.getRange(result.index + 2, 1, 1, HEADERS.length);
    range.setNumberFormat("@").setValues([result.rows[result.index]]);
    return json_({ ok: true, status: result.status, code: checked.entry.code });
  } finally {
    lock.releaseLock();
  }
}
