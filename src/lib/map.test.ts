import { describe, expect, it } from "vitest";
import {
  boothMapPath,
  campusMapUrl,
  distanceMeters,
  floorPlanWallsUrl,
  getJourneyLegs,
  getJourneySteps,
  getTourFloorPlans,
  getTourStopByBoothId,
  getTourStops,
  routeArrows,
  splitRoute,
  stampReturnPath,
  walkingDirectionsUrl,
  walkingMinutes,
} from "./map";

describe("tour map", () => {
  it("numbers tour stops in route order and places them on their floor plan", () => {
    const stops = getTourStops();

    expect(stops.map((stop) => stop.number)).toEqual(stops.map((_, index) => index + 1));
    expect(stops[0]?.booth.id).toBe("west-entry");

    expect(stops).toHaveLength(14);
    const arvp = getTourStopByBoothId("arvp");
    expect(arvp?.number).toBe(6);
    expect(arvp?.floorPlan.id).toBe("mece-3");
    expect(arvp?.point[0]).toBeCloseTo(0.805 * 1578);
  });

  it("has wall linework for every floor", () => {
    expect(getTourFloorPlans().filter((plan) => !floorPlanWallsUrl(plan)).map((plan) => plan.id)).toEqual([]);
  });

  it("returns the tour building floors in order", () => {
    expect(getTourFloorPlans().map((plan) => plan.floor)).toEqual([1, 2, 3]);
  });

  it("splits a route at the visitor's progress", () => {
    const route: [number, number][] = [[0, 0], [100, 0], [200, 0], [300, 0]];

    expect(splitRoute(route, [190, 10])).toEqual({ walked: route.slice(0, 3), ahead: route.slice(2) });
    expect(splitRoute(route, "none")).toEqual({ walked: [], ahead: route });
    expect(splitRoute(route, "all")).toEqual({ walked: route, ahead: [] });
  });

  it("spaces direction arrows along the route, pointing the way to walk", () => {
    const arrows = routeArrows([[0, 0], [100, 0], [100, 100]], 50);

    expect(arrows.map(({ x, y }) => [x, y])).toEqual([[25, 0], [75, 0], [100, 25], [100, 75]]);
    expect(arrows.map(({ angle }) => angle)).toEqual([0, 0, 90, 90]);
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

  it("returns scans started from the map to the right view", () => {
    expect(stampReturnPath("aero-design", "collected")).toBe("/map/tour?stamp=collected&booth=aero-design&at=aero-design");
    expect(stampReturnPath("open-house-booth", "duplicate")).toBe("/map/campus?stamp=duplicate&booth=open-house-booth");
  });

  it("measures walking distance between coordinates", () => {
    const butterdome = { lat: 53.523025, lng: -113.527911 };
    const mece = { lat: 53.527965, lng: -113.527887 };

    expect(distanceMeters(butterdome, mece)).toBeCloseTo(549, -1);
    expect(walkingMinutes(549)).toBe(9);
    expect(walkingMinutes(5)).toBe(1);
  });

  it("links booths to their tour stop or to the campus journey", () => {
    expect(boothMapPath("aero-design")).toBe("/map/tour?stop=aero-design");
    expect(boothMapPath("aero-design", true)).toBe("/map/tour?at=aero-design");
    expect(boothMapPath("open-house-booth", true)).toBe("/map/campus");
  });
});
