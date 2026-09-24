import eventData from "../data/event.json";
import scheduleData from "../data/schedule.json";
import type { Building, EventInfo, ScheduleEvent } from "../types/content";
import { getActiveBoothById, getBuildingById, type BoothDetails } from "./content";
import { boothMapPath, CAMPUS_MAP_PATH, campusMapUrl, getJourneySteps } from "./map";

const eventInfo = eventData as EventInfo;
const scheduleEvents = scheduleData as ScheduleEvent[];

export interface ScheduleItem extends ScheduleEvent {
  startsAt: Date;
  endsAt: Date;
  building?: Building;
  booth?: BoothDetails;
}

export type EventPhase = "before" | "during" | "after";
export type ItemStatus = "past" | "live" | "upcoming";

export type ScheduleMapLink =
  | { kind: "internal"; to: string }
  | { kind: "external"; href: string };

/** Offset (ms) between UTC and wall-clock time in `timeZone` at a given instant. */
function timeZoneOffset(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((entry) => entry.type === type)?.value);
  const wallClock = Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"), part("second"));
  return wallClock - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The instant a wall-clock `date` + `time` ("HH:MM") happens in `timeZone`, daylight saving included. */
export function zonedDateTime(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const asUtc = Date.UTC(year!, month! - 1, day!, hour!, minute!);
  const offset = timeZoneOffset(new Date(asUtc), timeZone);
  const corrected = timeZoneOffset(new Date(asUtc - offset), timeZone);
  return new Date(asUtc - corrected);
}

export function getEventInfo(): EventInfo {
  return eventInfo;
}

export function getEventHours(): { opensAt: Date; closesAt: Date } {
  return {
    opensAt: zonedDateTime(eventInfo.date, eventInfo.opensAt, eventInfo.timeZone),
    closesAt: zonedDateTime(eventInfo.date, eventInfo.closesAt, eventInfo.timeZone),
  };
}

const scheduleItems: ScheduleItem[] = scheduleEvents
  .map((event) => ({
    ...event,
    startsAt: zonedDateTime(eventInfo.date, event.start, eventInfo.timeZone),
    endsAt: zonedDateTime(eventInfo.date, event.end, eventInfo.timeZone),
    building: event.buildingId ? getBuildingById(event.buildingId) : undefined,
    booth: event.boothId ? getActiveBoothById(event.boothId) : undefined,
  }))
  .sort((first, second) => first.startsAt.getTime() - second.startsAt.getTime() || first.endsAt.getTime() - second.endsAt.getTime());

export function getScheduleItems(): ScheduleItem[] {
  return scheduleItems;
}

export function getEventPhase(now: Date): EventPhase {
  const { opensAt, closesAt } = getEventHours();
  if (now < opensAt) {
    return "before";
  }
  return now < closesAt ? "during" : "after";
}

export function getItemStatus(item: ScheduleItem, now: Date): ItemStatus {
  if (now >= item.endsAt) {
    return "past";
  }
  return now >= item.startsAt ? "live" : "upcoming";
}

/** Events running right now, ending soonest first. */
export function getHappeningNow(items: ScheduleItem[], now: Date): ScheduleItem[] {
  return items
    .filter((item) => getItemStatus(item, now) === "live")
    .sort((first, second) => first.endsAt.getTime() - second.endsAt.getTime());
}

/** The next events to start (all events sharing the earliest upcoming start time). */
export function getUpNext(items: ScheduleItem[], now: Date): ScheduleItem[] {
  const upcoming = items.filter((item) => item.startsAt > now);
  const nextStart = upcoming[0]?.startsAt.getTime();
  return upcoming.filter((item) => item.startsAt.getTime() === nextStart);
}

/** Where "Show on map" goes: a station's tour stop or journey step, else the building on the UAlberta map. */
export function getScheduleMapLink(item: ScheduleItem): ScheduleMapLink | undefined {
  if (item.booth) {
    return { kind: "internal", to: boothMapPath(item.booth.id) };
  }
  if (!item.building) {
    return undefined;
  }
  const isOnJourney = getJourneySteps(true).some((step) => step.buildingId === item.building?.id);
  return isOnJourney
    ? { kind: "internal", to: CAMPUS_MAP_PATH }
    : { kind: "external", href: campusMapUrl(item.building.position) };
}

export function getLocationText(item: ScheduleItem): string | undefined {
  const parts = [item.locationLabel, item.building?.abbreviation].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

export function formatTime(date: Date, timeZone = eventInfo.timeZone): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(date);
}

export function formatEventDate(date: Date, timeZone = eventInfo.timeZone): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "long", day: "numeric" }).format(date);
}

export function formatCountdown(milliseconds: number): string {
  const minutes = Math.max(1, Math.round(milliseconds / 60_000));
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 36) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** Reads a preview time from the URL: "HH:MM" on the event day, or "YYYY-MM-DDTHH:MM". */
export function parsePreviewTime(value: string): Date | undefined {
  const match = /^(?:(\d{4}-\d{2}-\d{2})T)?(\d{2}:\d{2})$/.exec(value.trim());
  if (!match) {
    return undefined;
  }
  return zonedDateTime(match[1] ?? eventInfo.date, match[2]!, eventInfo.timeZone);
}

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** A single-event iCalendar file that phones open in their calendar app. */
export function toIcs(item: ScheduleItem, createdAt = new Date()): string {
  const location = [item.locationLabel, item.building?.name].filter(Boolean).join(", ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MEC E Open House 2026//Schedule//EN",
    "BEGIN:VEVENT",
    `UID:${item.id}@mece-open-house-2026`,
    `DTSTAMP:${icsDate(createdAt)}`,
    `DTSTART:${icsDate(item.startsAt)}`,
    `DTEND:${icsDate(item.endsAt)}`,
    `SUMMARY:${icsText(item.title)}`,
    ...(location ? [`LOCATION:${icsText(location)}`] : []),
    ...(item.description ? [`DESCRIPTION:${icsText(item.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}
