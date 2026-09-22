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

/** Map page link that opens the tour on a stop, optionally marking it as the visitor's position. */
export function tourMapPath(boothId: string, isCurrentPosition = false): string {
  return `/map/tour?${isCurrentPosition ? "at" : "stop"}=${encodeURIComponent(boothId)}`;
}

/** Where to show a booth on the map: its tour stop, or the campus journey for other stations. */
export function boothMapPath(boothId: string, isCurrentPosition = false): string {
  return getTourStopByBoothId(boothId) ? tourMapPath(boothId, isCurrentPosition) : "/map";
}
