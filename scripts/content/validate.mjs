/**
 * Checks content read from the spreadsheet before it replaces src/data. Every message names the
 * tab and row so whoever edited the sheet can fix it. An empty list means it's safe to publish.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

const minutes = (time) => {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
};

function findDuplicates(rows, key) {
  const seen = new Map();
  const duplicates = [];
  for (const row of rows) {
    const value = row[key];
    if (value === undefined) continue;
    const normalised = String(value).toLowerCase().replace(/[\s-]/g, "");
    if (seen.has(normalised)) duplicates.push({ row, first: seen.get(normalised) });
    else seen.set(normalised, row);
  }
  return duplicates;
}

/**
 * @param sheet  rows from readWorkbook (each with __row)
 * @param root   repository root, for checking that logo and sticker files exist
 * @param fixed  content that stays in files: buildings and floorPlans
 */
export function validateSheet(sheet, root, { buildings, floorPlans }) {
  const errors = [];
  const at = (tab, row) => `${tab} tab, row ${row.__row}`;
  const buildingIds = new Set(buildings.map((building) => building.id));
  const event = sheet.Event ?? {};

  // Event
  if (event.opensAt && event.closesAt && minutes(event.opensAt) >= minutes(event.closesAt)) {
    errors.push(`Event tab: "Opens at" (${event.opensAt}) must be before "Closes at" (${event.closesAt}).`);
  }
  if (event.tourBuildingId && !buildingIds.has(event.tourBuildingId)) {
    errors.push(`Event tab: "Tour building ID" "${event.tourBuildingId}" isn't a building (use ${[...buildingIds].join(", ")}).`);
  }

  // Stalls
  const stalls = sheet.Stalls ?? [];
  const stallsById = new Map(stalls.map((row) => [row.id, row]));
  for (const key of ["id", "qrCode", "locationId", "stampId"]) {
    const label = { id: "ID", qrCode: "Code", locationId: "Location ID", stampId: "Sticker ID" }[key];
    for (const { row, first } of findDuplicates(stalls, key)) {
      errors.push(`${at("Stalls", row)}: ${label} "${row[key]}" is already used on row ${first.__row}.`);
    }
  }
  for (const row of stalls) {
    if (row.id && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.id)) errors.push(`${at("Stalls", row)}: ID "${row.id}" should be lowercase letters, numbers and dashes.`);
    if (row.buildingId && !buildingIds.has(row.buildingId)) errors.push(`${at("Stalls", row)}: Building ID "${row.buildingId}" isn't a building (use ${[...buildingIds].join(", ")}).`);
    if (row.logo && !existsSync(join(root, "assets/images/booths", row.logo))) errors.push(`${at("Stalls", row)}: logo file "${row.logo}" isn't in assets/images/booths.`);
    if (row.stickerImage && !existsSync(join(root, "public", row.stickerImage))) errors.push(`${at("Stalls", row)}: sticker image "${row.stickerImage}" isn't in public/ (expected public${row.stickerImage}).`);
    for (const key of ["pinX", "pinY"]) {
      if (row[key] !== undefined && (row[key] < 0 || row[key] > 1)) errors.push(`${at("Stalls", row)}: ${key === "pinX" ? "Pin X" : "Pin Y"} must be between 0 and 1.`);
    }
    if ((row.pinX === undefined) !== (row.pinY === undefined)) errors.push(`${at("Stalls", row)}: fill in both Pin X and Pin Y, or neither.`);
  }

  // Tour
  const tourBuilding = event.tourBuildingId;
  const plans = new Set(floorPlans.filter((plan) => plan.buildingId === tourBuilding).map((plan) => plan.floor));
  for (const { row, first } of findDuplicates(sheet.Tour ?? [], "boothId")) {
    errors.push(`${at("Tour", row)}: "${row.boothId}" is already on the tour (row ${first.__row}).`);
  }
  for (const row of sheet.Tour ?? []) {
    const stall = stallsById.get(row.boothId);
    if (!stall) {
      errors.push(`${at("Tour", row)}: Stall ID "${row.boothId}" isn't on the Stalls tab.`);
      continue;
    }
    if (stall.isActive === false) continue; // hidden stalls drop off the tour automatically
    if (stall.buildingId !== tourBuilding) errors.push(`${at("Tour", row)}: "${row.boothId}" is in ${stall.buildingId}, not the tour building (${tourBuilding}).`);
    if (stall.pinX === undefined) errors.push(`${at("Tour", row)}: "${row.boothId}" needs Pin X and Pin Y on the Stalls tab (row ${stall.__row}) to appear on the floor plan.`);
    if (!plans.has(stall.floor)) errors.push(`${at("Tour", row)}: "${row.boothId}" is on floor ${stall.floor}, which has no floor plan.`);
  }
  if (event.arrivalFloor !== undefined && !plans.has(event.arrivalFloor)) {
    errors.push(`Event tab: "Tour: floor visitors come in on" (${event.arrivalFloor}) has no floor plan.`);
  }

  // Schedule
  for (const { row, first } of findDuplicates(sheet.Schedule ?? [], "id")) {
    errors.push(`${at("Schedule", row)}: ID "${row.id}" is already used on row ${first.__row}.`);
  }
  for (const row of sheet.Schedule ?? []) {
    if (row.start && row.end && minutes(row.start) >= minutes(row.end)) errors.push(`${at("Schedule", row)}: "Starts" (${row.start}) must be before "Ends" (${row.end}).`);
    if (event.opensAt && event.closesAt && row.start && row.end && (minutes(row.start) < minutes(event.opensAt) || minutes(row.end) > minutes(event.closesAt))) {
      errors.push(`${at("Schedule", row)}: ${row.start}–${row.end} is outside the event hours (${event.opensAt}–${event.closesAt}).`);
    }
    if (row.buildingId && !buildingIds.has(row.buildingId)) errors.push(`${at("Schedule", row)}: Building ID "${row.buildingId}" isn't a building.`);
    if (row.boothId && !stallsById.has(row.boothId)) errors.push(`${at("Schedule", row)}: Stall ID "${row.boothId}" isn't on the Stalls tab.`);
  }

  // FAQ and Places
  for (const { row, first } of findDuplicates(sheet.FAQ ?? [], "id")) errors.push(`${at("FAQ", row)}: ID "${row.id}" is already used on row ${first.__row}.`);
  for (const { row, first } of findDuplicates(sheet.Places ?? [], "id")) errors.push(`${at("Places", row)}: ID "${row.id}" is already used on row ${first.__row}.`);
  for (const row of sheet.Places ?? []) {
    // Campus is roughly 53.51-53.54 N, 113.50-113.55 W; anything far outside is a typo or swapped numbers.
    if (row.lat !== undefined && row.lng !== undefined && (row.lat < 53.4 || row.lat > 53.7 || row.lng < -113.7 || row.lng > -113.3)) {
      errors.push(`${at("Places", row)}: ${row.lat}, ${row.lng} isn't near campus. Check the latitude and longitude aren't swapped.`);
    }
  }

  return errors;
}
