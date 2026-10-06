/**
 * Builds the content spreadsheet from the current src/data files.
 * Upload the result to Google Drive and open it with Google Sheets to start editing there.
 *
 *     npm run content:template            # writes content/open-house-content.xlsx
 */
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readData } from "./dataFiles.mjs";
import { toSheet } from "./sheetFormat.mjs";
import { buildWorkbook } from "./workbook.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const out = join(root, process.argv[2] ?? "content/open-house-content.xlsx");

mkdirSync(dirname(out), { recursive: true });
await buildWorkbook(toSheet(readData(root))).xlsx.writeFile(out);
console.log(`Wrote ${out}`);
