import { describe, expect, it } from "vitest";
import type { FloorPlan, Journey, Location, Tour } from "../types/content";
import booths from "./booths.json";
import buildings from "./buildings.json";
import floorPlansData from "./floorPlans.json";
import journeyData from "./journey.json";
import locationsData from "./locations.json";
import stamps from "./stamps.json";
import tourData from "./tour.json";

const locations = locationsData as Location[];
const floorPlans = floorPlansData as FloorPlan[];
const tour = tourData as Tour;
const journey = journeyData as Journey;

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
