/**
 * The Google Sheet layout for event content, and how each tab maps to the JSON files in
 * src/data. Used both to build the starter spreadsheet (exportTemplate.mjs) and to read the
 * sheet back during the build (sync.mjs), so the two can never drift apart.
 *
 * Column kinds: text, int, number, bool (Yes/No), time (HH:MM), date (YYYY-MM-DD),
 * paragraphs (blank line between paragraphs), lines (one item per line), links ("Label | URL" per line).
 */

import { hashQrPassword } from "./password.mjs";

export const YES = "Yes";
export const NO = "No";

/** Settings on the "Event" tab: one row each, as Setting | Value. */
export const EVENT_SETTINGS = [
  { key: "name", label: "Event name", kind: "text", required: true },
  { key: "date", label: "Date", kind: "date", required: true, help: "YYYY-MM-DD, e.g. 2026-10-17" },
  { key: "timeZone", label: "Time zone", kind: "text", required: true, help: "Leave as America/Edmonton" },
  { key: "opensAt", label: "Opens at", kind: "time", required: true, help: "24-hour clock, e.g. 09:00" },
  { key: "closesAt", label: "Closes at", kind: "time", required: true, help: "24-hour clock, e.g. 15:00" },
  { key: "isDraft", label: "Show 'draft schedule' notice?", kind: "bool", required: true },
  { key: "programsCalendarUrl", label: "Programs calendar link", kind: "text", help: "Optional. Adds a 'MEC E programs calendar' card" },
  { key: "qrPagePassword", label: "QR codes page password", kind: "text", help: "Type a new password to change it (8+ characters). Leave blank to keep the current one. Only a fingerprint is stored on the website" },
  { key: "tourBuildingId", label: "Tour building ID", kind: "text", required: true, help: "Leave as mece" },
  { key: "arrivalFloor", label: "Tour: floor visitors come in on", kind: "int", required: true },
  { key: "arrivalDirections", label: "Tour: 'Coming in from outside?' directions", kind: "text", required: true },
];

/** Table tabs. Columns are in sheet order; `key` is the field name used while converting. */
export const TABS = {
  Schedule: {
    help: "One row per event. The page sorts them by time.",
    columns: [
      { key: "id", header: "ID", kind: "text", required: true, help: "Unique, lowercase, dashes instead of spaces" },
      { key: "title", header: "Title", kind: "text", required: true },
      { key: "description", header: "Description", kind: "text" },
      { key: "start", header: "Starts", kind: "time", required: true, help: "24-hour clock, e.g. 10:00" },
      { key: "end", header: "Ends", kind: "time", required: true },
      { key: "category", header: "Category", kind: "text", required: true, options: ["presentation", "tour", "booth-fair", "food", "general"] },
      { key: "scope", header: "Scope", kind: "text", options: ["mece", "university"] },
      { key: "buildingId", header: "Building ID", kind: "text", help: "vvc, etlc or mece. Adds 'Show on map'" },
      { key: "boothId", header: "Stall ID", kind: "text", help: "An ID from the Stalls tab" },
      { key: "locationLabel", header: "Location label", kind: "text", help: "e.g. Room E1-001" },
      { key: "isConfirmed", header: "Confirmed?", kind: "bool", required: true },
    ],
  },
  Stalls: {
    help: "One row per stall, with its location and passport sticker.",
    columns: [
      { key: "id", header: "ID", kind: "text", required: true, help: "Unique, lowercase, dashes. Don't change it once QR codes are printed" },
      { key: "name", header: "Name", kind: "text", required: true },
      { key: "category", header: "Category", kind: "text", required: true, options: ["student-group", "program", "research", "event", "welcome"] },
      { key: "icon", header: "Map icon", kind: "text", help: "e.g. rocket, drone, plane, robot, flask, trophy, users" },
      { key: "shortDescription", header: "Card description", kind: "text", required: true, help: "First paragraph, shown on the stall card" },
      { key: "moreDescription", header: "More description", kind: "paragraphs", help: "Extra paragraphs for the stall page. Leave a blank line between paragraphs" },
      { key: "logo", header: "Logo file", kind: "text", help: "File name in assets/images/booths, e.g. arvp.webp" },
      { key: "buildingId", header: "Building ID", kind: "text", required: true, help: "vvc, etlc or mece" },
      { key: "floor", header: "Floor", kind: "int", required: true },
      { key: "room", header: "Room", kind: "text", required: true },
      { key: "pinX", header: "Pin X (0-1)", kind: "number", help: "Position on the floor plan, left to right. Leave blank for campus stalls" },
      { key: "pinY", header: "Pin Y (0-1)", kind: "number", help: "Position on the floor plan, top to bottom" },
      { key: "stickerName", header: "Sticker name", kind: "text", required: true },
      { key: "stickerDescription", header: "Sticker description", kind: "text", required: true },
      { key: "stickerImage", header: "Sticker image", kind: "text", required: true, help: "e.g. /assets/stamps/arvp.svg (a file in public/assets/stamps)" },
      { key: "holo", header: "Shimmer?", kind: "bool" },
      { key: "qrCode", header: "Code", kind: "text", required: true, help: "6 capitals/digits. Changing it means reprinting the QR code" },
      { key: "isActive", header: "Active?", kind: "bool", required: true, help: "No hides the stall without deleting it" },
      { key: "locationId", header: "Location ID (technical)", kind: "text", required: true },
      { key: "stampId", header: "Sticker ID (technical)", kind: "text", required: true },
    ],
  },
  Tour: {
    help: "The building tour, top to bottom = stop 1, 2, 3 ...",
    columns: [
      { key: "boothId", header: "Stall ID", kind: "text", required: true, help: "An ID from the Stalls tab" },
      { key: "directionsToNext", header: "Directions to the next stop", kind: "text" },
    ],
  },
  FAQ: {
    help: "Questions on the Help page, grouped by category in the order they first appear.",
    columns: [
      { key: "id", header: "ID", kind: "text", required: true },
      { key: "category", header: "Category", kind: "text", required: true },
      { key: "question", header: "Question", kind: "text", required: true },
      { key: "answer", header: "Answer", kind: "text", required: true },
      { key: "list", header: "Bullet points", kind: "lines", help: "One per line" },
      { key: "links", header: "Links", kind: "links", help: "One per line: Label | https://..." },
      { key: "footer", header: "Closing line", kind: "text" },
      { key: "toConfirm", header: "'To be confirmed' badge?", kind: "bool" },
      { key: "hidden", header: "Hidden?", kind: "bool" },
    ],
  },
  Places: {
    help: "Food, parking, help tents and transit on the campus map.",
    columns: [
      { key: "id", header: "ID", kind: "text", required: true },
      { key: "category", header: "Category", kind: "text", required: true, options: ["food", "parking", "help", "transit"] },
      { key: "kind", header: "Kind", kind: "text", options: ["bus"], help: "bus = small bus-stop pin" },
      { key: "name", header: "Name", kind: "text", required: true },
      { key: "abbreviation", header: "Map label", kind: "text", required: true },
      { key: "note", header: "Note", kind: "text", help: "e.g. Free 8 AM – 5 PM" },
      { key: "lat", header: "Latitude", kind: "number", required: true, help: "From Google Maps: right-click > copy coordinates" },
      { key: "lng", header: "Longitude", kind: "number", required: true },
      { key: "official", header: "Recommended (star)?", kind: "bool" },
      { key: "minZoom", header: "Only when zoomed in to", kind: "int", help: "e.g. 17. Blank = always shown" },
    ],
  },
};

const isSet = (value) => value !== undefined && value !== null && value !== "";

/** Drops unset optional fields so the JSON stays as tidy as the hand-written files. */
function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => isSet(value) && !(Array.isArray(value) && value.length === 0)));
}

/** `true` only when set; optional Yes/No flags are left out of the JSON when No. */
const flag = (value) => (value === true ? true : undefined);

// ---------- JSON -> rows (for the starter spreadsheet) ----------

export function toSheet(data) {
  const { event, tour, schedule, booths, stamps, locations, faq, places } = data;
  const stampsById = new Map(stamps.map((stamp) => [stamp.id, stamp]));
  const locationsById = new Map(locations.map((location) => [location.id, location]));

  return {
    Event: {
      ...event,
      tourBuildingId: tour.buildingId,
      arrivalFloor: tour.arrival?.floor,
      arrivalDirections: tour.arrival?.directions,
    },
    Schedule: schedule.map((item) => ({ ...item })),
    Stalls: booths.map((booth) => {
      const stamp = stampsById.get(booth.stampId) ?? {};
      const location = locationsById.get(booth.locationId) ?? {};
      return {
        id: booth.id,
        name: booth.name,
        category: booth.category,
        icon: booth.icon,
        shortDescription: booth.shortDescription,
        moreDescription: booth.moreDescription,
        logo: booth.logo,
        buildingId: location.buildingId,
        floor: location.floor,
        room: location.room,
        pinX: location.coordinates?.x,
        pinY: location.coordinates?.y,
        stickerName: stamp.name,
        stickerDescription: stamp.description,
        stickerImage: stamp.image,
        holo: stamp.holo === true,
        qrCode: booth.qrCode,
        isActive: booth.isActive,
        locationId: booth.locationId,
        stampId: booth.stampId,
      };
    }),
    Tour: tour.stops.map((stop) => ({ ...stop })),
    FAQ: faq.map((entry) => ({ ...entry, toConfirm: entry.toConfirm === true, hidden: entry.hidden === true })),
    Places: places.map((place) => ({
      ...place,
      lat: place.position.lat,
      lng: place.position.lng,
      official: place.official === true,
    })),
  };
}

// ---------- rows -> JSON (what the build writes to src/data) ----------

/**
 * @param previous  the current src/data content, used for values the sheet leaves blank on purpose
 *                  (the QR page password: blank keeps the existing one)
 */
export function fromSheet(sheet, previous = {}) {
  const event = sheet.Event;
  return {
    event: compact({
      name: event.name,
      date: event.date,
      timeZone: event.timeZone,
      opensAt: event.opensAt,
      closesAt: event.closesAt,
      programsCalendarUrl: event.programsCalendarUrl,
      isDraft: event.isDraft === true,
      qrPagePasswordHash: event.qrPagePassword ? hashQrPassword(event.qrPagePassword) : previous.event?.qrPagePasswordHash,
    }),
    tour: {
      buildingId: event.tourBuildingId,
      arrival: { floor: event.arrivalFloor, directions: event.arrivalDirections },
      stops: sheet.Tour.map((row) => compact({ boothId: row.boothId, directionsToNext: row.directionsToNext })),
    },
    schedule: sheet.Schedule.map((row) =>
      compact({
        id: row.id,
        title: row.title,
        description: row.description,
        start: row.start,
        end: row.end,
        category: row.category,
        scope: row.scope,
        buildingId: row.buildingId,
        boothId: row.boothId,
        locationLabel: row.locationLabel,
        isConfirmed: row.isConfirmed === true,
      }),
    ),
    booths: sheet.Stalls.map((row) =>
      compact({
        id: row.id,
        name: row.name,
        shortDescription: row.shortDescription,
        moreDescription: row.moreDescription,
        logo: row.logo,
        locationId: row.locationId,
        stampId: row.stampId,
        qrCode: row.qrCode,
        category: row.category,
        icon: row.icon,
        isActive: row.isActive === true,
      }),
    ),
    stamps: sheet.Stalls.map((row) =>
      compact({
        id: row.stampId,
        name: row.stickerName,
        description: row.stickerDescription,
        image: row.stickerImage,
        boothId: row.id,
        holo: flag(row.holo),
      }),
    ),
    locations: sheet.Stalls.map((row) =>
      compact({
        id: row.locationId,
        buildingId: row.buildingId,
        floor: row.floor,
        room: row.room,
        coordinates: isSet(row.pinX) && isSet(row.pinY) ? { x: row.pinX, y: row.pinY } : undefined,
      }),
    ),
    faq: sheet.FAQ.map((row) =>
      compact({
        id: row.id,
        category: row.category,
        question: row.question,
        answer: row.answer,
        list: row.list,
        links: row.links,
        footer: row.footer,
        toConfirm: flag(row.toConfirm),
        hidden: flag(row.hidden),
      }),
    ),
    places: sheet.Places.map((row) =>
      compact({
        id: row.id,
        category: row.category,
        kind: row.kind,
        name: row.name,
        abbreviation: row.abbreviation,
        note: row.note,
        position: { lat: row.lat, lng: row.lng },
        official: flag(row.official),
        minZoom: row.minZoom,
      }),
    ),
  };
}
