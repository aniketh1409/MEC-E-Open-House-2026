import type { VisitorPassportState } from "../types/content";
import { getEventInfo, zonedDateTime } from "./schedule";

/**
 * Prize draw for visitors who collect every sticker. Entries go to the organizers' private Google
 * Sheet through an Apps Script web app (content/draw-entries.gs), which checks them, keeps one row
 * per passport and refuses an email already used by another passport.
 */

export interface DrawSettings {
  endpoint: string;
  closesAt: Date;
  prize?: string;
  terms?: string;
}

/** The draw's settings, or undefined when it's switched off or not connected yet. */
export function getDrawSettings(): DrawSettings | undefined {
  const event = getEventInfo();
  if (!event.drawEnabled || !event.drawEndpoint) {
    return undefined;
  }
  return {
    endpoint: event.drawEndpoint,
    closesAt: zonedDateTime(event.date, event.drawClosesAt ?? event.closesAt, event.timeZone),
    prize: event.drawPrize,
    terms: event.drawTerms,
  };
}

/** Short code shown to the visitor and in the entries sheet (same as entryCode_ in the script). */
export function entryCode(passportId: string): string {
  const hex = passportId.replace(/[^0-9a-f]/gi, "").toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

export interface DrawEntryForm {
  name: string;
  email: string;
}

export interface SavedDrawEntry extends DrawEntryForm {
  code: string;
  submittedAt: string;
  /** "pending" = saved on the phone, to send when there's signal. */
  status: "sent" | "pending";
}

const ENTRY_KEY = "mece-open-house-draw-v1";

export function loadDrawEntry(): SavedDrawEntry | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(ENTRY_KEY) ?? "null") as SavedDrawEntry | null;
    return value && typeof value.email === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

function saveDrawEntry(entry: SavedDrawEntry): void {
  try {
    localStorage.setItem(ENTRY_KEY, JSON.stringify(entry));
  } catch {
    // Storage unavailable: the entry still goes to the sheet; this phone just won't remember it.
  }
}

/** A message from the entries script for the visitor, e.g. "This email is already entered in the draw." */
export class DrawEntryRejected extends Error {}

export type SubmitResult = { status: "sent" } | { status: "pending" };

function payload(passport: VisitorPassportState, form: DrawEntryForm, submittedAt: string) {
  const times = Object.values(passport.collectedAt ?? {}).sort();
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    consent: true,
    passportId: passport.passportId,
    stickers: passport.collectedStamps.length,
    firstStickerAt: times[0] ?? "",
    lastStickerAt: times.at(-1) ?? "",
    submittedAt,
    website: "", // bot trap; filled only by bots
  };
}

async function send(settings: DrawSettings, body: ReturnType<typeof payload>): Promise<void> {
  // text/plain keeps this a "simple" request, which Apps Script web apps accept from another site.
  const response = await fetch(settings.endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as { ok: boolean; error?: string };
  if (!result.ok) {
    throw new DrawEntryRejected(result.error ?? "Your entry couldn't be saved. Please try again.");
  }
}

/**
 * Sends (or re-sends, after an edit) the visitor's entry. With no signal it's kept on the phone as
 * "pending" and sent by `sendPendingEntry` later. Throws DrawEntryRejected for problems to show.
 */
export async function submitDrawEntry(
  settings: DrawSettings,
  passport: VisitorPassportState,
  form: DrawEntryForm,
  now: Date = new Date(),
): Promise<SubmitResult> {
  const submittedAt = now.toISOString();
  const record: SavedDrawEntry = { name: form.name.trim(), email: form.email.trim(), code: entryCode(passport.passportId), submittedAt, status: "pending" };
  try {
    await send(settings, payload(passport, form, submittedAt));
  } catch (error) {
    if (error instanceof DrawEntryRejected) {
      throw error;
    }
    saveDrawEntry(record);
    return { status: "pending" };
  }
  saveDrawEntry({ ...record, status: "sent" });
  return { status: "sent" };
}

/** Sends an entry saved while offline. Returns the updated record, or undefined if nothing changed. */
export async function sendPendingEntry(settings: DrawSettings, passport: VisitorPassportState): Promise<SavedDrawEntry | undefined> {
  const saved = loadDrawEntry();
  if (!saved || saved.status !== "pending") {
    return undefined;
  }
  try {
    await send(settings, payload(passport, saved, saved.submittedAt));
  } catch (error) {
    if (error instanceof DrawEntryRejected) {
      // E.g. the email was taken meanwhile: drop it so the visitor can try again.
      try {
        localStorage.removeItem(ENTRY_KEY);
      } catch {
        // ignore
      }
      throw error;
    }
    return undefined;
  }
  const sent: SavedDrawEntry = { ...saved, status: "sent" };
  saveDrawEntry(sent);
  return sent;
}

const COMMON_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com", "ualberta.ca", "live.com", "shaw.ca", "telus.net"];

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0]!;
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j]!;
      previous[j] = Math.min(previous[j]! + 1, previous[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length]!;
}

/** "Did you mean …?" for a likely typo in a common email domain (gmial.com, hotmail.con). */
export function suggestEmail(email: string): string | undefined {
  const match = /^([^\s@]+)@([^\s@]+)$/.exec(email.trim().toLowerCase());
  if (!match) {
    return undefined;
  }
  const [, user, domain] = match;
  if (COMMON_DOMAINS.includes(domain!)) {
    return undefined;
  }
  const closest = COMMON_DOMAINS.map((candidate) => ({ candidate, distance: editDistance(domain!, candidate) })).sort(
    (first, second) => first.distance - second.distance,
  )[0]!;
  return closest.distance > 0 && closest.distance <= 2 ? `${user}@${closest.candidate}` : undefined;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
