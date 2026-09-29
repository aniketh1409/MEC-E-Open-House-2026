# Event content

All event content lives in this folder as JSON. Updating the schedule needs no code changes: edit the files below, then run `npm test`. The tests check the data and name any entry with a mistake.

## `event.json`: the day itself

| Field | Example | Notes |
|---|---|---|
| `name` | `"Mechanical Engineering Open House 2026"` | |
| `date` | `"2026-10-17"` | Year-month-day |
| `timeZone` | `"America/Edmonton"` | Leave as is |
| `opensAt` / `closesAt` | `"09:00"` / `"15:00"` | 24-hour clock. Every event must fall inside these hours |
| `programsCalendarUrl` | `"https://…"` | Optional. Adds a "MEC E programs calendar" card. Leave it out to hide the card |
| `isDraft` | `true` | Shows a "Draft schedule" notice. Set it to `false` (or remove it) once the schedule is final |

## Building floor plans (`floorPlans.json`, `tour.json`)

- Each floor's walls are an image in `assets/maps/` (`mece-1-walls.png`, …), made by `python scripts/build_floor_art.py` from the tour map PDF and `assets/maps/source/mece-1-floor-plan.png`. Pins, routes and labels use the same pixel coordinates as that image.
- `route` is the dashed line on each floor; `pointsOfInterest` labels like `"Up to 3F"` mark the stairs to take.
- `tour.json` → `arrival` holds the "Coming in from outside?" directions shown with the first stop.

## `places.json`: food, parking, help tents and transit

Shown on the campus map when a visitor turns on the matching "Nearby" chip, and offered as "Where to?" destinations. Each entry has an `id`, a `category` (`food`, `parking`, `help` or `transit`), a `name`, a short `abbreviation` for the map label, an optional `note` (e.g. `"Free 8 AM – 5 PM"`) and a `position` (`lat`/`lng`, e.g. from OpenStreetMap or Google Maps).

Optional: `"official": true` marks an organizer-recommended spot with a star and always shows it; `"minZoom": 17` only shows a place once the map is zoomed in (used for the extra cafés and the bus stops); `"kind": "bus"` gives transit stops the small bus pin and keeps them out of the "Where to?" list.

## `faq.json`: questions on the Help page

Each entry has an `id`, a `category` (entries are grouped by it, in first-seen order), a `question` and an `answer`. Optional: `list` (bullet points under the answer), `links` (`[{ "label", "url" }]`), `"hidden": true` to keep an entry in the file without showing it, and `"toConfirm": true` to show a "To be confirmed" badge.

## `schedule.json`: one entry per event

Copy an existing entry and change the values. The order doesn't matter: the page sorts events by time.

```json
{
  "id": "presentation-2",
  "title": "MEC E program presentation",
  "description": "Dr. Nobes introduces the program, followed by questions.",
  "start": "11:00",
  "end": "11:30",
  "category": "presentation",
  "scope": "mece",
  "buildingId": "etlc",
  "boothId": "program-presentation",
  "locationLabel": "Room TBD",
  "isConfirmed": true
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | Yes | Unique, lowercase, dashes instead of spaces. Repeat sessions need their own ids (`presentation-1`, `presentation-2`, …) |
| `title` | Yes | |
| `description` | No | One or two sentences |
| `start` / `end` | Yes | 24-hour clock, e.g. `"13:30"` for 1:30 PM. Times are on the day set in `event.json` |
| `category` | Yes | One of `presentation`, `tour`, `booth-fair`, `food`, `general` |
| `scope` | Yes | `mece` for department events, `university` for Open House-wide ones ("University-wide" badge) |
| `buildingId` | No | An `id` from `buildings.json` (`vvc`, `etlc`, `mece`). Adds "Show on map" |
| `boothId` | No | An `id` from `booths.json`. "Show on map" then opens that exact station, e.g. a tour stop |
| `locationLabel` | No | Room or area, e.g. `"Room 3-26"` or `"Room TBD"` |
| `isConfirmed` | No | Set to `false` while a time may still change ("Time TBC" badge) |

**A building that isn't on the map yet?** Add it to `buildings.json` with its name and coordinates, then use its `id`. "Show on map" opens it on the UAlberta campus map.

## Previewing a time of day

Add `?now=` to the schedule address to see the page as it will look at that time, e.g. `/schedule?now=10:15` (on the event day) or `/schedule?now=2026-10-14T09:00` (any date). This is handy for checking the "Happening now" card before the event.

## Campus directions ("Where to?")

- **Destinations** are the buildings in `buildings.json`. Adding a building there (with the coordinates of its main entrance) adds it to the "Where to?" lists automatically.
- **The walking network** (`campusPaths.json`) is generated from OpenStreetMap and shouldn't be edited by hand. To refresh it, for example after campus paths change, run `python scripts/build_campus_paths.py` and then `npm test`. If a new building is outside the covered area, widen `BBOX` in that script first.
- **Switching the feature off:** set `campusRouting` to `false` in `src/config/features.ts`. The map returns to the fixed journey, with directions handed to Google Maps.
