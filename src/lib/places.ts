import placesData from "../data/places.json";
import type { Place, PlaceCategory } from "../types/content";

const places = placesData as Place[];

export const PLACE_CATEGORIES: { id: PlaceCategory; label: string }[] = [
  { id: "food", label: "Food" },
  { id: "parking", label: "Parking" },
  { id: "help", label: "Help tents" },
  { id: "transit", label: "Transit" },
];

/** Food, parking, help tents and transit around campus (places.json). */
export function getPlaces(): Place[] {
  return places;
}
