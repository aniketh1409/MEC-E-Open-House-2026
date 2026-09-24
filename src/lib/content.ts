import boothsData from "../data/booths.json";
import buildingsData from "../data/buildings.json";
import locationsData from "../data/locations.json";
import stampsData from "../data/stamps.json";
import type { Booth, Building, Location, Stamp } from "../types/content";

const booths = boothsData as Booth[];
const buildings = buildingsData as Building[];
const locations = locationsData as Location[];
const stamps = stampsData as Stamp[];

const buildingsById = new Map(buildings.map((building) => [building.id, building]));
const locationsById = new Map(locations.map((location) => [location.id, location]));
const stampsById = new Map(stamps.map((stamp) => [stamp.id, stamp]));

export interface BoothDetails extends Booth {
  location: Location;
  building: Building;
  stamp: Stamp;
}

function joinBooth(booth: Booth): BoothDetails {
  const location = locationsById.get(booth.locationId);
  const building = location && buildingsById.get(location.buildingId);
  const stamp = stampsById.get(booth.stampId);

  if (!location || !building || !stamp) {
    throw new Error(`Booth "${booth.id}" has an invalid content reference.`);
  }

  return { ...booth, location, building, stamp };
}

export function getBuildingById(id: string): Building | undefined {
  return buildingsById.get(id);
}

export function getBuildings(): Building[] {
  return buildings;
}

export function getActiveBooths(): BoothDetails[] {
  return booths
    .filter((booth) => booth.isActive)
    .map(joinBooth)
    .sort((first, second) => first.name.localeCompare(second.name));
}

export function getActiveBoothById(id: string): BoothDetails | undefined {
  const booth = booths.find((candidate) => candidate.id === id && candidate.isActive);
  return booth ? joinBooth(booth) : undefined;
}

export function getActiveBoothByQrCode(qrCode: string): BoothDetails | undefined {
  const booth = booths.find(
    (candidate) => candidate.qrCode === qrCode && candidate.isActive,
  );
  return booth ? joinBooth(booth) : undefined;
}

export function getActiveBoothCategories(): string[] {
  return [...new Set(getActiveBooths().map((booth) => booth.category))].sort();
}

export function formatCategory(category: string): string {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
