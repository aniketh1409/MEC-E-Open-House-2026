export interface Booth {
  id: string;
  name: string;
  shortDescription: string;
  locationId: string;
  stampId: string;
  qrCode: string;
  category: string;
  /** Key from the stop icon registry, e.g. "rocket". */
  icon?: string;
  isActive: boolean;
}

export interface Location {
  id: string;
  buildingId: string;
  floor: number;
  room: string;
  /** Normalized (0-1) position on the building's floor plan, when one exists. */
  coordinates?: {
    x: number;
    y: number;
  };
}

export interface Stamp {
  id: string;
  name: string;
  description: string;
  image: string;
  boothId: string;
}

export interface VisitorPassportState {
  passportId: string;
  collectedStamps: string[];
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Building {
  id: string;
  abbreviation: string;
  name: string;
  /** Visitor entrance used for campus directions. */
  position: LatLng;
}

export interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
}

/** A point on a floor plan, in the floor plan's own viewBox units. */
export type PlanPoint = [x: number, y: number];

export interface FloorPlanRoom {
  label?: string;
  points: PlanPoint[];
}

export type PointOfInterestType = "elevator" | "stairs" | "washroom" | "entrance";

export interface PointOfInterest {
  type: PointOfInterestType;
  x: number;
  y: number;
  label?: string;
}

export interface FloorPlan {
  id: string;
  buildingId: string;
  floor: number;
  label: string;
  width: number;
  height: number;
  outline: PlanPoint[];
  rooms: FloorPlanRoom[];
  pointsOfInterest: PointOfInterest[];
  /** Suggested walking route on this floor, drawn as a line. */
  route: PlanPoint[];
}

export interface TourStopEntry {
  boothId: string;
  /** How to walk from this stop to the next one. */
  directionsToNext?: string;
}

export interface Tour {
  buildingId: string;
  stops: TourStopEntry[];
}

export interface JourneyStep {
  id: string;
  title: string;
  description: string;
  buildingId: string;
  /** Station visitors can collect a stamp at during this step. */
  boothId?: string;
  optional?: boolean;
}

export interface JourneyLeg {
  from: string;
  to: string;
  distanceMeters: number;
  minutes: number;
  /** Walking path as [lat, lng] pairs. */
  path: [lat: number, lng: number][];
}

export interface Journey {
  steps: JourneyStep[];
  legs: JourneyLeg[];
}
