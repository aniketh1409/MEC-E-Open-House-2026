/**
 * Tests the prize draw Apps Script's checking and saving logic by loading content/draw-entries.gs
 * into a sandbox (the Google services it calls are only used in doGet/doPost, not tested here).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sandbox = {};
vm.runInNewContext(
  `${readFileSync(resolve(root, "content/draw-entries.gs"), "utf8")}
   this.checkEntry_ = checkEntry_; this.upsertEntry_ = upsertEntry_; this.entryCode_ = entryCode_;`,
  sandbox,
);
const { checkEntry_, upsertEntry_, entryCode_ } = sandbox;
// Values from the sandbox use its own Array/Object, so compare as plain JSON.
const plain = (value) => JSON.parse(JSON.stringify(value));

const closesAtMs = Date.parse("2026-10-17T15:00:00-06:00");
const config = { closesAtMs, requiredStickers: 16, graceMinutes: 60 };
const beforeClose = Date.parse("2026-10-17T13:30:00-06:00");
const entry = {
  name: "  Alex   Rivera ",
  email: "Alex.Rivera@Example.com ",
  consent: true,
  passportId: "3f9a2c1e-7b44-4d2a-9c1d-5e6f7a8b9c0d",
  stickers: 16,
  firstStickerAt: "2026-10-17T15:10:00Z",
  lastStickerAt: "2026-10-17T18:40:00Z",
  submittedAt: "2026-10-17T19:30:00Z",
};

describe("prize draw entries script", () => {
  it("accepts a complete, on-time entry and tidies the name and email", () => {
    const result = plain(checkEntry_(entry, config, beforeClose));

    expect(result.ok).toBe(true);
    expect(result.entry).toMatchObject({ name: "Alex Rivera", email: "alex.rivera@example.com", code: "3F9A-2C1E", minutes: 210, flags: [] });
  });

  it("refuses incomplete passports, bad emails, missing consent and late entries", () => {
    expect(checkEntry_({ ...entry, stickers: 15 }, config, beforeClose).error).toBe("Collect all 16 stickers to enter the draw.");
    expect(checkEntry_({ ...entry, email: "alex@example" }, config, beforeClose).error).toBe("Please enter a valid email address.");
    expect(checkEntry_({ ...entry, consent: false }, config, beforeClose).error).toBe("Please agree to the terms to enter.");
    expect(checkEntry_({ ...entry, name: "A" }, config, beforeClose).error).toBe("Please enter your full name.");

    const afterClose = closesAtMs + 5 * 60000;
    expect(checkEntry_({ ...entry, submittedAt: new Date(afterClose).toISOString() }, config, afterClose).error).toBe("Sorry, the prize draw has closed.");
  });

  it("still accepts an entry made before closing but sent a little later (e.g. after a dead zone)", () => {
    const sentLate = closesAtMs + 20 * 60000;
    expect(checkEntry_({ ...entry, submittedAt: "2026-10-17T20:55:00Z" }, config, sentLate).ok).toBe(true);
    expect(checkEntry_({ ...entry, submittedAt: "2026-10-17T20:55:00Z" }, config, closesAtMs + 90 * 60000).ok).toBe(false);
  });

  it("flags passports completed suspiciously fast and quietly ignores the bot trap", () => {
    const fast = plain(checkEntry_({ ...entry, lastStickerAt: "2026-10-17T15:13:00Z" }, config, beforeClose));
    expect(fast.entry.flags).toEqual(["All stickers in 3 min"]);

    expect(plain(checkEntry_({ ...entry, website: "http://spam.example" }, config, beforeClose))).toEqual({ ok: true, ignored: true });
  });

  it("keeps one row per passport, so entering again fixes a typo instead of adding a duplicate", () => {
    const first = checkEntry_({ ...entry, email: "alex@gmial.com" }, config, beforeClose).entry;
    const created = plain(upsertEntry_([], first, "2026-10-17T19:30:00.000Z"));
    expect(created.status).toBe("created");

    const fixed = checkEntry_({ ...entry, email: "alex@gmail.com" }, config, beforeClose).entry;
    const updated = plain(upsertEntry_(created.rows, fixed, "2026-10-17T19:35:00.000Z"));
    expect(updated.status).toBe("updated");
    expect(updated.rows).toHaveLength(1);
    expect(updated.rows[0].slice(0, 4)).toEqual(["2026-10-17T19:30:00.000Z", "2026-10-17T19:35:00.000Z", "Alex Rivera", "alex@gmail.com"]);
  });

  it("refuses an email already entered from a different passport", () => {
    const first = checkEntry_(entry, config, beforeClose).entry;
    const { rows } = plain(upsertEntry_([], first, "2026-10-17T19:30:00.000Z"));
    const other = checkEntry_({ ...entry, passportId: "9b8a7c6d-0000-4000-8000-000000000000" }, config, beforeClose).entry;

    expect(plain(upsertEntry_(rows, other, "2026-10-17T19:40:00.000Z"))).toEqual({ error: "This email is already entered in the draw." });
  });

  it("derives the same entry code the website shows", () => {
    expect(entryCode_("3f9a2c1e-7b44-4d2a-9c1d-5e6f7a8b9c0d")).toBe("3F9A-2C1E");
  });
});
