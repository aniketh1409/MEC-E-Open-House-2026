import floorPlansData from "../data/floorPlans.json";
import journeyData from "../data/journey.json";
import tourData from "../data/tour.json";
import type {
  Building,
  FloorPlan,
  Journey,
  JourneyLeg,
  JourneyStep,
  LatLng,
  PlanPoint,
  Tour,
} from "../types/content";
import { getActiveBoothById, getBuildingById, type BoothDetails } from "./content";

const floorPlans = floorPlansData as FloorPlan[];
const tour = tourData as Tour;
const journey = journeyData as Journey;

export interface TourStop {
  number: number;
  booth: BoothDetails;
  floorPlan: FloorPlan;
  /** Pin position in the floor plan's viewBox units. */
  point: PlanPoint;
  directionsToNext?: string;
}

export interface JourneyStepDetails extends JourneyStep {
  number: number;
  building: Building;
  booth?: BoothDetails;
}

function getFloorPlan(buildingId: string, floor: number): FloorPlan | undefined {
  return floorPlans.find((plan) => plan.buildingId === buildingId && plan.floor === floor);
}

function buildTourStops(): TourStop[] {
  const stops: TourStop[] = [];

  for (const entry of tour.stops) {
    const booth = getActiveBoothById(entry.boothId);
    if (!booth) {
      continue;
    }

    const floorPlan = getFloorPlan(booth.location.buildingId, booth.location.floor);
    const coordinates = booth.location.coordinates;
    if (!floorPlan || !coordinates) {
      throw new Error(`Tour stop "${booth.id}" has no floor plan position.`);
    }

    stops.push({
      number: stops.length + 1,
      booth,
      floorPlan,
      point: [coordinates.x * floorPlan.width, coordinates.y * floorPlan.height],
      directionsToNext: entry.directionsToNext,
    });
  }

  return stops;
}

const tourStops = buildTourStops();

export function getTourStops(): TourStop[] {
  return tourStops;
}

export function getTourStopByBoothId(boothId: string): TourStop | undefined {
  return tourStops.find((stop) => stop.booth.id === boothId);
}

export function getTourFloorPlans(): FloorPlan[] {
  return floorPlans
    .filter((plan) => plan.buildingId === tour.buildingId)
    .sort((first, second) => first.floor - second.floor);
}

export function getJourneySteps(includeOptional: boolean): JourneyStepDetails[] {
  return journey.steps
    .filter((step) => includeOptional || !step.optional)
    .map((step, index) => {
      const building = getBuildingById(step.buildingId);
      if (!building) {
        throw new Error(`Journey step "${step.id}" has an invalid building.`);
      }

      const booth = step.boothId ? getActiveBoothById(step.boothId) : undefined;
      return { ...step, number: index + 1, building, booth };
    });
}

export function getJourneyLeg(fromStepId: string, toStepId: string): JourneyLeg {
  const leg = journey.legs.find((candidate) => candidate.from === fromStepId && candidate.to === toStepId);
  if (!leg) {
    throw new Error(`No walking route from "${fromStepId}" to "${toStepId}".`);
  }
  return leg;
}

export function getJourneyLegs(steps: JourneyStep[]): JourneyLeg[] {
  return steps.slice(1).map((step, index) => getJourneyLeg(steps[index]!.id, step.id));
}

export function walkingDirectionsUrl({ lat, lng }: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
}

export function campusMapUrl({ lat, lng }: LatLng): string {
  return `https://www.ualberta.ca/en/maps.html?l=${lat},${lng}&z=18&campus=north_campus`;
}

export const CAMPUS_MAP_PATH = "/map/campus";
export const TOUR_MAP_PATH = "/map/tour";

/** Map page link that opens the tour on a stop, optionally marking it as the visitor's position. */
export function tourMapPath(boothId: string, isCurrentPosition = false): string {
  return `${TOUR_MAP_PATH}?${isCurrentPosition ? "at" : "stop"}=${encodeURIComponent(boothId)}`;
}

/** Where to show a booth on the map: its tour stop, or the campus journey for other stations. */
export function boothMapPath(boothId: string, isCurrentPosition = false): string {
  return getTourStopByBoothId(boothId) ? tourMapPath(boothId, isCurrentPosition) : CAMPUS_MAP_PATH;
}

export type StampResult = "collected" | "duplicate";

/** Where a visitor returns after scanning from the map, with the result to announce. */
export function stampReturnPath(boothId: string, result: StampResult): string {
  const params = new URLSearchParams({ stamp: result, booth: boothId });
  if (getTourStopByBoothId(boothId)) {
    params.set("at", boothId);
    return `${TOUR_MAP_PATH}?${params}`;
  }
  return `${CAMPUS_MAP_PATH}?${params}`;
}

export type RouteProgress = PlanPoint | "all" | "none";

/** Splits a floor's route at the vertex closest to the visitor's progress point. */
export function splitRoute(route: PlanPoint[], progress: RouteProgress): { walked: PlanPoint[]; ahead: PlanPoint[] } {
  if (progress === "none" || route.length === 0) {
    return { walked: [], ahead: route };
  }
  if (progress === "all") {
    return { walked: route, ahead: [] };
  }

  const [px, py] = progress;
  let closest = 0;
  route.forEach(([x, y], index) => {
    const [cx, cy] = route[closest]!;
    if (Math.hypot(x - px, y - py) < Math.hypot(cx - px, cy - py)) {
      closest = index;
    }
  });

  return { walked: route.slice(0, closest + 1), ahead: route.slice(closest) };
}

export interface RouteArrow {
  x: number;
  y: number;
  /** Direction of travel in degrees. */
  angle: number;
}

/** Evenly spaced arrows along a route, pointing in the walking direction. */
export function routeArrows(route: PlanPoint[], spacing: number): RouteArrow[] {
  const arrows: RouteArrow[] = [];
  let untilNext = spacing / 2;

  for (let index = 1; index < route.length; index += 1) {
    const [x1, y1] = route[index - 1]!;
    const [x2, y2] = route[index]!;
    const length = Math.hypot(x2 - x1, y2 - y1);
    const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    let travelled = untilNext;

    while (travelled <= length) {
      const ratio = travelled / length;
      arrows.push({ x: x1 + (x2 - x1) * ratio, y: y1 + (y2 - y1) * ratio, angle });
      travelled += spacing;
    }
    untilNext = travelled - length;
  }

  return arrows;
}

/** Straight-line distance in metres between two coordinates. */
export function distanceMeters(from: LatLng, to: LatLng): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
}

/** Walking estimate: paths are ~25% longer than a straight line, at 80 m per minute. */
export function walkingMinutes(straightLineMeters: number): number {
  return Math.max(1, Math.round((straightLineMeters * 1.25) / 80));
}
