import { describe, expect, it } from "vitest";
import type { EventInfo, FloorPlan, Journey, Location, ScheduleEvent, Tour } from "../types/content";
import booths from "./booths.json";
import buildings from "./buildings.json";
import eventData from "./event.json";
import floorPlansData from "./floorPlans.json";
import journeyData from "./journey.json";
import locationsData from "./locations.json";
import scheduleData from "./schedule.json";
import stamps from "./stamps.json";
import tourData from "./tour.json";

const locations = locationsData as Location[];
const floorPlans = floorPlansData as FloorPlan[];
const tour = tourData as Tour;
const journey = journeyData as Journey;
const eventInfo = eventData as EventInfo;
const schedule = scheduleData as ScheduleEvent[];

function expectUnique(values: string[]) {
  expect(new Set(values).size).toBe(values.length);
}

describe("placeholder event data", () => {
  it("uses unique identifiers and QR codes", () => {
    expectUnique(booths.map((booth) => booth.id));
    expectUnique(booths.map((booth) => booth.qrCode));
    expectUnique(buildings.map((building) => building.id));
    expectUnique(locations.map((location) => location.id));
    expectUnique(stamps.map((stamp) => stamp.id));
    expectUnique(floorPlans.map((plan) => plan.id));
  });

  it("keeps booth, location, building, and stamp references consistent", () => {
    const boothIds = new Set(booths.map((booth) => booth.id));
    const buildingIds = new Set(buildings.map((building) => building.id));
    const locationIds = new Set(locations.map((location) => location.id));
    const stampIds = new Set(stamps.map((stamp) => stamp.id));

    for (const booth of booths) {
      expect(locationIds.has(booth.locationId)).toBe(true);
      expect(stampIds.has(booth.stampId)).toBe(true);
    }

    for (const location of locations) {
      expect(buildingIds.has(location.buildingId)).toBe(true);
    }

    for (const stamp of stamps) {
      expect(boothIds.has(stamp.boothId)).toBe(true);
      expect(stamp).not.toHaveProperty("collected");
    }
  });

  it("uses normalized floor-plan coordinates", () => {
    for (const { coordinates } of locations) {
      if (!coordinates) {
        continue;
      }
      expect(coordinates.x).toBeGreaterThanOrEqual(0);
      expect(coordinates.x).toBeLessThanOrEqual(1);
      expect(coordinates.y).toBeGreaterThanOrEqual(0);
      expect(coordinates.y).toBeLessThanOrEqual(1);
    }
  });
});

describe("map data", () => {
  it("keeps floor plan geometry inside each plan", () => {
    for (const plan of floorPlans) {
      const points = [
        ...plan.outline,
        ...plan.route,
        ...plan.rooms.flatMap((room) => room.points),
        ...plan.pointsOfInterest.map((poi) => [poi.x, poi.y] as const),
      ];

      for (const [x, y] of points) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(plan.width);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(plan.height);
      }
    }
  });

  it("places every tour stop once on a floor plan in the tour building", () => {
    const tourBoothIds = tour.stops.map((stop) => stop.boothId);
    expectUnique(tourBoothIds);

    for (const boothId of tourBoothIds) {
      const booth = booths.find((candidate) => candidate.id === boothId);
      const location = locations.find((candidate) => candidate.id === booth?.locationId);

      expect(booth, boothId).toBeDefined();
      expect(location?.buildingId).toBe(tour.buildingId);
      expect(location?.coordinates, boothId).toBeDefined();
      expect(
        floorPlans.some((plan) => plan.buildingId === tour.buildingId && plan.floor === location?.floor),
      ).toBe(true);
    }
  });

  it("connects every pair of journey steps a visitor can walk between", () => {
    const stepIds = new Set(journey.steps.map((step) => step.id));
    const buildingIds = new Set(buildings.map((building) => building.id));
    const boothIds = new Set(booths.map((booth) => booth.id));

    for (const step of journey.steps) {
      expect(buildingIds.has(step.buildingId)).toBe(true);
      if (step.boothId) {
        expect(boothIds.has(step.boothId)).toBe(true);
      }
    }

    for (const leg of journey.legs) {
      expect(stepIds.has(leg.from)).toBe(true);
      expect(stepIds.has(leg.to)).toBe(true);
      expect(leg.path.length).toBeGreaterThan(1);
    }

    const requiredSteps = journey.steps.filter((step) => !step.optional);
    for (const routeSteps of [journey.steps, requiredSteps]) {
      for (let index = 1; index < routeSteps.length; index += 1) {
        const from = routeSteps[index - 1]!.id;
        const to = routeSteps[index]!.id;
        expect(
          journey.legs.some((leg) => leg.from === from && leg.to === to),
          `${from} -> ${to}`,
        ).toBe(true);
      }
    }
  });
});

describe("schedule data", () => {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));

  it("describes the event day and hours", () => {
    expect(eventInfo.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(new Date(`${eventInfo.date}T00:00:00Z`).getTime())).toBe(false);
    expect(() => new Intl.DateTimeFormat("en-US", { timeZone: eventInfo.timeZone })).not.toThrow();
    expect(eventInfo.opensAt).toMatch(time);
    expect(eventInfo.closesAt).toMatch(time);
    expect(minutes(eventInfo.closesAt)).toBeGreaterThan(minutes(eventInfo.opensAt));
  });

  it("uses valid, unique events inside opening hours", () => {
    expectUnique(schedule.map((event) => event.id));
    const categories = ["presentation", "tour", "booth-fair", "food", "general"];

    for (const event of schedule) {
      expect(event.start, `${event.id} start`).toMatch(time);
      expect(event.end, `${event.id} end`).toMatch(time);
      expect(minutes(event.end), `${event.id} ends after it starts`).toBeGreaterThan(minutes(event.start));
      expect(minutes(event.start), `${event.id} starts after opening`).toBeGreaterThanOrEqual(minutes(eventInfo.opensAt));
      expect(minutes(event.end), `${event.id} ends before closing`).toBeLessThanOrEqual(minutes(eventInfo.closesAt));
      expect(categories, `${event.id} category`).toContain(event.category);
      expect(["mece", "university"], `${event.id} scope`).toContain(event.scope);
    }
  });

  it("links events to real buildings and stations", () => {
    const buildingIds = new Set(buildings.map((building) => building.id));
    const boothIds = new Set(booths.map((booth) => booth.id));

    for (const event of schedule) {
      if (event.buildingId) {
        expect(buildingIds.has(event.buildingId), `${event.id} building "${event.buildingId}"`).toBe(true);
      }
      if (event.boothId) {
        expect(boothIds.has(event.boothId), `${event.id} booth "${event.boothId}"`).toBe(true);
      }
    }
  });
});
