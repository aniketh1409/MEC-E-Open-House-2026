import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  formatTime,
  getEventPhase,
  getHappeningNow,
  getItemStatus,
  getScheduleItems,
  getScheduleMapLink,
  getUpNext,
  parsePreviewTime,
  toIcs,
  zonedDateTime,
} from "./schedule";

const items = getScheduleItems();
const item = (id: string) => items.find((candidate) => candidate.id === id)!;
const at = (time: string) => parsePreviewTime(time)!;

describe("event times", () => {
  it("converts Edmonton wall-clock times, including daylight saving", () => {
    expect(zonedDateTime("2026-10-17", "09:00", "America/Edmonton").toISOString()).toBe("2026-10-17T15:00:00.000Z");
    expect(zonedDateTime("2026-01-15", "09:00", "America/Edmonton").toISOString()).toBe("2026-01-15T16:00:00.000Z");
  });

  it("formats times in the event's time zone", () => {
    expect(formatTime(zonedDateTime("2026-10-17", "13:30", "America/Edmonton"))).toBe("1:30 PM");
  });

  it("reads preview times from the URL", () => {
    expect(at("10:15").toISOString()).toBe("2026-10-17T16:15:00.000Z");
    expect(parsePreviewTime("2026-10-14T12:00")?.toISOString()).toBe("2026-10-14T18:00:00.000Z");
    expect(parsePreviewTime("tomorrow")).toBeUndefined();
  });

  it("describes countdowns in friendly units", () => {
    expect(formatCountdown(20 * 60_000)).toBe("20 minutes");
    expect(formatCountdown(5 * 3_600_000)).toBe("5 hours");
    expect(formatCountdown(3 * 86_400_000)).toBe("3 days");
  });
});

describe("live schedule", () => {
  it("sorts events by start time", () => {
    const starts = items.map((entry) => entry.startsAt.getTime());
    expect(starts).toEqual([...starts].sort((first, second) => first - second));
  });

  it("knows whether the Open House has started", () => {
    expect(getEventPhase(at("08:59"))).toBe("before");
    expect(getEventPhase(at("09:00"))).toBe("during");
    expect(getEventPhase(at("15:00"))).toBe("after");
  });

  it("finds what is on now and what starts next", () => {
    const now = at("10:15");

    expect(getHappeningNow(items, now).map((entry) => entry.id)).toEqual(["building-tour", "booth-fair"]);
    expect(getUpNext(items, now).map((entry) => entry.id)).toEqual(["presentation-2"]);
    expect(getItemStatus(item("presentation-1"), now)).toBe("past");
  });

  it("links events to the right map", () => {
    expect(getScheduleMapLink(item("building-tour"))).toEqual({ kind: "internal", to: "/map/tour?stop=west-entry" });
    expect(getScheduleMapLink(item("presentation-1"))).toEqual({ kind: "internal", to: "/map/campus" });
    expect(getScheduleMapLink(item("concession"))).toEqual({ kind: "internal", to: "/map/campus" });
  });
});

describe("calendar files", () => {
  it("creates an iCalendar event in UTC with escaped text", () => {
    const ics = toIcs(item("concession"), new Date("2026-10-01T00:00:00Z"));

    expect(ics).toContain("BEGIN:VEVENT\r\n");
    expect(ics).toContain("DTSTART:20261017T173000Z");
    expect(ics).toContain("DTEND:20261017T193000Z");
    expect(ics).toContain("DTSTAMP:20261001T000000Z");
    expect(ics).toContain("LOCATION:Second-level concourse\\, Butterdome (Universiade Pavilion)");
  });
});
