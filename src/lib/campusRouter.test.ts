import { describe, expect, it } from "vitest";
import campusPaths from "../data/campusPaths.json";
import buildings from "../data/buildings.json";
import { CampusRouter, metersBetween, type CampusPathsData } from "./campusRouter";

/**
 * A tiny test network (1 unit = 1e-4 degrees):
 *
 *   C ---- D        A→B and B→C run north; C→D runs east;
 *   |               B→E is a pedway going east.
 *   B ---- E
 *   |
 *   A
 */
const grid: CampusPathsData = {
  origin: [53.5, -113.5],
  scale: 10_000,
  kinds: ["path", "road", "steps", "pedway"],
  names: ["Main Walk", "Top Street"],
  nodes: [
    [0, 0], // A
    [10, 0], // B
    [20, 0], // C
    [20, 10], // D
    [10, 10], // E
  ],
  edges: [
    [0, 1, 111, 0, 0, []],
    [1, 2, 111, 0, 0, []],
    [2, 3, 66, 1, 1, []],
    [1, 4, 66, 3, -1, []],
  ],
};
const at = (lat: number, lng: number) => ({ lat: 53.5 + lat / 10_000, lng: -113.5 + lng / 10_000 });

describe("campus router", () => {
  const router = new CampusRouter(grid);

  it("follows the network and describes each turn", () => {
    const route = router.route(at(0, 0), at(20, 10), "D Building")!;

    expect(route.steps.map((step) => step.instruction)).toEqual([
      "Head north along Main Walk",
      "Turn right onto Top Street",
      "Arrive at D Building",
    ]);
    expect(route.distanceMeters).toBeGreaterThan(280);
    expect(route.distanceMeters).toBeLessThan(300);
    expect(route.usesPedway).toBe(false);
  });

  it("calls out indoor pedways", () => {
    const route = router.route(at(0, 0), at(10, 10), "E Building")!;

    expect(route.steps.map((step) => step.instruction)).toContain("Turn right through the pedway (indoors)");
    expect(route.usesPedway).toBe(true);
  });

  it("starts from the nearest point on a path, not just a junction", () => {
    const route = router.route(at(5, 1), at(20, 10), "D Building")!;

    // From halfway along A-B: about 55 m north to B, 111 m to C, 66 m east to D (+ ~7 m to reach the path).
    expect(route.distanceMeters).toBeGreaterThan(225);
    expect(route.distanceMeters).toBeLessThan(250);
    expect(metersBetween(route.path[0]!, [at(5, 1).lat, at(5, 1).lng])).toBe(0);
  });

  it("walks straight along a single path when both ends are on it", () => {
    const route = router.route(at(2, 0), at(8, 0), "Somewhere")!;

    expect(route.steps).toHaveLength(2);
    expect(route.distanceMeters).toBeCloseTo(67, -1);
  });
});

describe("campus walking network", () => {
  const router = new CampusRouter(campusPaths as unknown as CampusPathsData);
  const building = (id: string) => buildings.find((candidate) => candidate.id === id)!;

  it("routes between every pair of event buildings", () => {
    for (const from of buildings) {
      for (const to of buildings) {
        if (from.id === to.id) continue;
        const route = router.route(from.position, to.position, to.name);
        expect(route, `${from.id} -> ${to.id}`).toBeDefined();
        // A walking route is never shorter than the straight line, nor wildly longer.
        const straight = metersBetween([from.position.lat, from.position.lng], [to.position.lat, to.position.lng]);
        expect(route!.distanceMeters).toBeGreaterThanOrEqual(straight * 0.95);
        expect(route!.distanceMeters).toBeLessThan(straight * 2.5);
      }
    }
  });

  it("finds a realistic Butterdome to MEC E walk", () => {
    const route = router.route(building("butterdome").position, building("mece").position, "Mechanical Engineering Building")!;

    expect(route.distanceMeters).toBeGreaterThan(550);
    expect(route.distanceMeters).toBeLessThan(900);
    expect(route.minutes).toBeGreaterThanOrEqual(7);
    expect(route.minutes).toBeLessThanOrEqual(12);
    expect(route.steps.at(-1)?.instruction).toBe("Arrive at Mechanical Engineering Building");
  });
});
