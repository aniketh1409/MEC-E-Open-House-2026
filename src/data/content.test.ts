import { describe, expect, it } from "vitest";
import booths from "./booths.json";
import locations from "./locations.json";
import stamps from "./stamps.json";

function expectUnique(values: string[]) {
  expect(new Set(values).size).toBe(values.length);
}

describe("placeholder event data", () => {
  it("uses unique identifiers and QR codes", () => {
    expectUnique(booths.map((booth) => booth.id));
    expectUnique(booths.map((booth) => booth.qrCode));
    expectUnique(locations.map((location) => location.id));
    expectUnique(stamps.map((stamp) => stamp.id));
  });

  it("keeps booth, location, and stamp references consistent", () => {
    const boothIds = new Set(booths.map((booth) => booth.id));
    const locationIds = new Set(locations.map((location) => location.id));
    const stampIds = new Set(stamps.map((stamp) => stamp.id));

    for (const booth of booths) {
      expect(locationIds.has(booth.locationId)).toBe(true);
      expect(stampIds.has(booth.stampId)).toBe(true);
    }

    for (const stamp of stamps) {
      expect(boothIds.has(stamp.boothId)).toBe(true);
      expect(stamp).not.toHaveProperty("collected");
    }
  });

  it("uses normalized floor-plan coordinates", () => {
    for (const location of locations) {
      expect(location.coordinates.x).toBeGreaterThanOrEqual(0);
      expect(location.coordinates.x).toBeLessThanOrEqual(1);
      expect(location.coordinates.y).toBeGreaterThanOrEqual(0);
      expect(location.coordinates.y).toBeLessThanOrEqual(1);
    }
  });
});
