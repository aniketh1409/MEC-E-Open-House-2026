import { describe, expect, it } from "vitest";
import type { CampusRoute } from "./campusRouter";
import { formatCueDistance, getNavigationCue } from "./navigation";

function route(distanceMeters: number, steps: CampusRoute["steps"]): CampusRoute {
  return { path: [], distanceMeters, minutes: 1, steps, usesPedway: false };
}

describe("live navigation cues", () => {
  it("shows the next turn and how far away it is", () => {
    const cue = getNavigationCue(
      route(300, [
        { instruction: "Head west along 87 Avenue NW", distanceMeters: 42, maneuver: "depart" },
        { instruction: "Turn right onto 116 Street NW", distanceMeters: 120, maneuver: "right" },
        { instruction: "Turn left", distanceMeters: 80, maneuver: "left" },
        { instruction: "Arrive at ETLC", distanceMeters: 0, maneuver: "arrive" },
      ]),
    );

    expect(cue).toEqual({
      arrived: false,
      maneuver: "right",
      instruction: "Turn right onto 116 Street NW",
      inMeters: 42,
      then: "Turn left",
    });
  });

  it("leads up to the arrival on the last stretch", () => {
    const cue = getNavigationCue(
      route(60, [
        { instruction: "Head north", distanceMeters: 60, maneuver: "depart" },
        { instruction: "Arrive at ETLC", distanceMeters: 0, maneuver: "arrive" },
      ]),
    );

    expect(cue).toMatchObject({ arrived: false, maneuver: "arrive", instruction: "Arrive at ETLC", inMeters: 60 });
    expect(cue.then).toBeUndefined();
  });

  it("says you've arrived when you're close", () => {
    const cue = getNavigationCue(route(12, [{ instruction: "Arrive at ETLC", distanceMeters: 0, maneuver: "arrive" }]));

    expect(cue.arrived).toBe(true);
  });

  it("rounds distances the way people read them", () => {
    expect(formatCueDistance(6)).toBe("Now");
    expect(formatCueDistance(43)).toBe("In 45 m");
    expect(formatCueDistance(137)).toBe("In 140 m");
  });
});
