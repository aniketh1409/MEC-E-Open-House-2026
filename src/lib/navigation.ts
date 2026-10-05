import type { CampusRoute, Maneuver } from "./campusRouter";

/** Close enough to call it "arrived" (m); a little more than typical GPS error. */
export const ARRIVED_WITHIN_METERS = 20;

export interface NavigationCue {
  arrived: boolean;
  /** The upcoming turn (or the arrival). */
  maneuver: Maneuver;
  instruction: string;
  /** Distance to that turn (m). */
  inMeters: number;
  /** The turn after it, as a preview. */
  then?: string;
}

/**
 * What to show while navigating. The route is recalculated from the visitor's live position,
 * so its first step is always "where you are now" and the second is the next thing to do.
 * That makes steps advance, and the route re-plan after a wrong turn, without extra tracking.
 */
export function getNavigationCue(route: CampusRoute): NavigationCue {
  const [current, next, after] = route.steps;
  if (!current || route.distanceMeters <= ARRIVED_WITHIN_METERS) {
    const arrival = route.steps.at(-1);
    return { arrived: true, maneuver: "arrive", instruction: arrival?.instruction ?? "You've arrived", inMeters: 0 };
  }
  if (!next) {
    return { arrived: false, maneuver: current.maneuver, instruction: current.instruction, inMeters: current.distanceMeters };
  }
  return {
    arrived: false,
    maneuver: next.maneuver,
    instruction: next.instruction,
    inMeters: current.distanceMeters,
    then: after && after.maneuver !== "arrive" ? after.instruction : undefined,
  };
}

/** "In 40 m", rounded the way people read distances while walking. */
export function formatCueDistance(meters: number): string {
  if (meters < 10) {
    return "Now";
  }
  return `In ${meters < 100 ? Math.round(meters / 5) * 5 : Math.round(meters / 10) * 10} m`;
}
