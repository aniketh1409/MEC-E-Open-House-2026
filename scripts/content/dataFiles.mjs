/**
 * Reading and writing the JSON files in src/data, in the same style as the hand-written ones
 * (two-space indent, Windows line endings, places one per line) so diffs stay small.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const DATA_FILES = ["event", "tour", "schedule", "booths", "stamps", "locations", "faq", "places"];

export function readData(root) {
  const read = (name) => JSON.parse(readFileSync(join(root, "src/data", `${name}.json`), "utf8"));
  return {
    ...Object.fromEntries(DATA_FILES.map((name) => [name, read(name)])),
    buildings: read("buildings"),
    floorPlans: read("floorPlans"),
  };
}

/** Python-style `{"a": 1, "b": 2}` on one line, matching places.json. */
function inline(value) {
  if (Array.isArray(value)) return `[${value.map(inline).join(", ")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${inline(item)}`).join(", ")}}`;
  }
  return JSON.stringify(value);
}

function serialise(name, value) {
  if (name === "places") return `[\n${value.map((place) => `  ${inline(place)}`).join(",\n")}\n]\n`;
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** Writes the files that changed; returns their names. */
export function writeData(root, data) {
  const changed = [];
  for (const name of DATA_FILES) {
    const path = join(root, "src/data", `${name}.json`);
    const previous = existsSync(path) ? readFileSync(path, "utf8") : "";
    const crlf = previous.includes("\r\n") || !previous;
    const text = serialise(name, data[name]).replace(/\n/g, crlf ? "\r\n" : "\n");
    if (text !== previous) {
      writeFileSync(path, text);
      changed.push(name);
    }
  }
  return changed;
}
