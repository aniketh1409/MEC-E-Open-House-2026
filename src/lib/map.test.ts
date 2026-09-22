import { describe, expect, it } from "vitest";
import {
  boothMapPath,
  campusMapUrl,
  getJourneyLegs,
  getJourneySteps,
  getTourFloorPlans,
  getTourStopByBoothId,
  getTourStops,
  walkingDirectionsUrl,
} from "./map";

describe("tour map", () => {
  it("numbers tour stops in route order and places them on their floor plan", () => {
    const stops = getTourStops();

    expect(stops.map((stop) => stop.number)).toEqual(stops.map((_, index) => index + 1));
    expect(stops[0]?.booth.id).toBe("west-entry");

    const arvp = getTourStopByBoothId("arvp");
    expect(arvp?.floorPlan.id).toBe("mece-2");
    expect(arvp?.point[0]).toBeCloseTo(0.662 * 1798);
  });

  it("returns the tour building floors in order", () => {
    expect(getTourFloorPlans().map((plan) => plan.floor)).toEqual([2, 3]);
  });
});

describe("campus journey", () => {
  it("includes the presentation only when the visitor is attending", () => {
    expect(getJourneySteps(true).map((step) => step.id)).toEqual(["start", "presentation", "tour"]);
    expect(getJourneySteps(false).map((step) => step.id)).toEqual(["start", "tour"]);
    expect(getJourneySteps(false).map((step) => step.number)).toEqual([1, 2]);
  });

  it("finds a walking leg between each pair of steps", () => {
    const legs = getJourneyLegs(getJourneySteps(false));

    expect(legs).toHaveLength(1);
    expect(legs[0]).toMatchObject({ from: "start", to: "tour" });
  });

  it("builds external map links", () => {
    const position = { lat: 53.5, lng: -113.5 };

    expect(walkingDirectionsUrl(position)).toContain("destination=53.5,-113.5");
    expect(walkingDirectionsUrl(position)).toContain("travelmode=walking");
    expect(campusMapUrl(position)).toContain("l=53.5,-113.5");
  });

  it("links booths to their tour stop or to the campus journey", () => {
    expect(boothMapPath("ecocar")).toBe("/map/tour?stop=ecocar");
    expect(boothMapPath("ecocar", true)).toBe("/map/tour?at=ecocar");
    expect(boothMapPath("open-house-booth", true)).toBe("/map");
  });
});
