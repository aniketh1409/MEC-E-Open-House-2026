/**
 * Reads and writes the content spreadsheet (.xlsx, which is also what Google Sheets exports).
 */
import ExcelJS from "exceljs";
import { EVENT_SETTINGS, NO, TABS, YES } from "./sheetFormat.mjs";

const GREEN = "FF275D38";
const GOLD = "FFF2CD00";
const PALE = "FFEEF4F0";

// ---------- cell -> value ----------

function cellText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("text" in value) return String(value.text); // hyperlink cell
    if ("result" in value) return cellText(value.result); // formula cell
    if (value instanceof Date) return value;
  }
  return value;
}

const pad = (n) => String(n).padStart(2, "0");

/** Turns one cell into the value its column expects; returns { value } or { error }. */
function parseCell(raw, kind) {
  const value = cellText(raw);
  if (value === "" || (typeof value === "string" && value.trim() === "")) return { value: undefined };

  switch (kind) {
    case "bool": {
      if (value === true || value === false) return { value };
      const text = String(value).trim().toLowerCase();
      if (["yes", "y", "true"].includes(text)) return { value: true };
      if (["no", "n", "false"].includes(text)) return { value: false };
      return { error: `should be Yes or No, not "${value}"` };
    }
    case "int":
    case "number": {
      const number = typeof value === "number" ? value : Number(String(value).trim());
      if (!Number.isFinite(number)) return { error: `should be a number, not "${value}"` };
      if (kind === "int" && !Number.isInteger(number)) return { error: `should be a whole number, not "${value}"` };
      return { value: number };
    }
    case "time": {
      // Sheets may store 10:00 as a time (a Date on 1899-12-30, or a fraction of a day).
      if (value instanceof Date) return { value: `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}` };
      if (typeof value === "number" && value >= 0 && value < 1) {
        const minutes = Math.round(value * 24 * 60);
        return { value: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}` };
      }
      const match = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
      if (!match || +match[1] > 23 || +match[2] > 59) return { error: `should be a 24-hour time like 10:00, not "${value}"` };
      return { value: `${pad(+match[1])}:${match[2]}` };
    }
    case "date": {
      if (value instanceof Date) return { value: `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}` };
      const text = String(value).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { error: `should be a date like 2026-10-17, not "${value}"` };
      return { value: text };
    }
    case "paragraphs": {
      const paragraphs = String(value).replace(/\r/g, "").split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
      return { value: paragraphs.length ? paragraphs : undefined };
    }
    case "lines": {
      const lines = String(value).replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean);
      return { value: lines.length ? lines : undefined };
    }
    case "links": {
      const links = [];
      for (const line of String(value).replace(/\r/g, "").split("\n").map((part) => part.trim()).filter(Boolean)) {
        const [label, url] = line.split("|").map((part) => part.trim());
        if (!label || !url || !/^https?:\/\//.test(url)) return { error: `each line should be "Label | https://...", not "${line}"` };
        links.push({ label, url });
      }
      return { value: links.length ? links : undefined };
    }
    default:
      return { value: String(value).trim() };
  }
}

// ---------- value -> cell ----------

function formatCell(value, kind) {
  if (value === undefined || value === null) return null;
  switch (kind) {
    case "bool":
      return value ? YES : NO;
    case "paragraphs":
      return value.join("\n\n");
    case "lines":
      return value.join("\n");
    case "links":
      return value.map((link) => `${link.label} | ${link.url}`).join("\n");
    default:
      return value;
  }
}

// ---------- reading ----------

const normalise = (text) => String(cellText(text)).trim().toLowerCase();

/** Reads every content tab. Returns { sheet, errors } where errors name the tab and row. */
export async function readWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const errors = [];
  const sheet = {};

  const eventTab = workbook.getWorksheet("Event");
  if (!eventTab) {
    errors.push(`The "Event" tab is missing.`);
  } else {
    const byLabel = new Map();
    eventTab.eachRow((row, rowNumber) => rowNumber > 1 && byLabel.set(normalise(row.getCell(1).value), { row, rowNumber }));
    sheet.Event = {};
    for (const setting of EVENT_SETTINGS) {
      const found = byLabel.get(setting.label.toLowerCase());
      if (!found) {
        if (setting.required) errors.push(`Event tab: the "${setting.label}" row is missing.`);
        continue;
      }
      const parsed = parseCell(found.row.getCell(2).value, setting.kind);
      if (parsed.error) errors.push(`Event tab, row ${found.rowNumber} (${setting.label}): ${parsed.error}.`);
      else if (parsed.value === undefined && setting.required) errors.push(`Event tab, row ${found.rowNumber}: "${setting.label}" is empty.`);
      else sheet.Event[setting.key] = parsed.value;
    }
  }

  for (const [name, tab] of Object.entries(TABS)) {
    const worksheet = workbook.getWorksheet(name);
    if (!worksheet) {
      errors.push(`The "${name}" tab is missing.`);
      sheet[name] = [];
      continue;
    }
    // Match columns by header so editors can reorder or add their own notes columns.
    const headerRow = worksheet.getRow(1);
    const columnFor = new Map();
    headerRow.eachCell((cell, columnNumber) => columnFor.set(normalise(cell.value), columnNumber));
    const missing = tab.columns.filter((column) => !columnFor.has(column.header.toLowerCase()));
    for (const column of missing) errors.push(`${name} tab: the "${column.header}" column is missing.`);

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const record = { __row: rowNumber };
      const invalid = new Set();
      let hasContent = false;
      for (const column of tab.columns) {
        const columnNumber = columnFor.get(column.header.toLowerCase());
        if (!columnNumber) continue;
        const parsed = parseCell(row.getCell(columnNumber).value, column.kind);
        if (parsed.error) {
          errors.push(`${name} tab, row ${rowNumber} (${column.header}): ${parsed.error}.`);
          invalid.add(column.key);
          hasContent = true;
        } else if (parsed.value !== undefined) {
          record[column.key] = parsed.value;
          hasContent = true;
        }
      }
      if (!hasContent) return; // blank row
      for (const column of tab.columns) {
        if (column.required && record[column.key] === undefined && !invalid.has(column.key) && columnFor.has(column.header.toLowerCase())) {
          errors.push(`${name} tab, row ${rowNumber}: "${column.header}" is empty.`);
        }
        if (column.options && record[column.key] !== undefined && !column.options.includes(record[column.key])) {
          errors.push(`${name} tab, row ${rowNumber} (${column.header}): should be one of ${column.options.join(", ")}, not "${record[column.key]}".`);
        }
      }
      rows.push(record);
    });
    sheet[name] = rows;
  }

  return { sheet, errors };
}

// ---------- writing (the starter spreadsheet) ----------

function styleHeader(row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
  row.alignment = { vertical: "middle", wrapText: true };
  row.height = 32;
}

function addValidation(worksheet, columnNumber, rowCount, kind, options) {
  const list = kind === "bool" ? [YES, NO] : options;
  if (!list) return;
  for (let row = 2; row <= rowCount + 200; row++) {
    worksheet.getCell(row, columnNumber).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${list.join(",")}"`],
    };
  }
}

const WIDTHS = { text: 28, paragraphs: 60, lines: 40, links: 44, bool: 12, int: 10, number: 14, time: 10, date: 14 };
const WIDE = new Set(["shortDescription", "description", "answer", "directionsToNext", "stickerDescription", "name", "question", "title"]);

export function buildWorkbook(sheet) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MEC E Open House website";

  const guide = workbook.addWorksheet("How to edit", { properties: { tabColor: { argb: GOLD } } });
  guide.columns = [{ width: 110 }];
  [
    "MEC E Open House website content",
    "",
    "Each tab is one part of the website. Edit the cells, then use the menu Website > Publish changes.",
    "The website checks everything first. If something is wrong (a missing name, a time like 25:00, a duplicate code),",
    "nothing changes on the site and the problem is listed with its tab and row.",
    "",
    "Tips",
    "• Yes/No columns have a dropdown. Times are 24-hour (10:00, 14:30). Dates are YYYY-MM-DD.",
    "• 'More description' and 'Bullet points' can have several lines: press Ctrl+Enter (Cmd+Enter on Mac) inside the cell.",
    "• To hide a stall without deleting it, set Active? to No. Don't change a stall's ID or Code after its QR code is printed.",
    "• Columns marked (technical) link the stall to its location and sticker. Copy them from a similar row when adding a stall.",
    "• Hover over a column heading to see what it's for. You can add your own columns for notes; the website ignores them.",
    "• Floor plans, walking paths, logos and sticker artwork are files in the code repository, not in this sheet.",
  ].forEach((line, index) => {
    const cell = guide.getCell(index + 1, 1);
    cell.value = line;
    if (index === 0) cell.font = { bold: true, size: 16, color: { argb: GREEN } };
    if (line === "Tips") cell.font = { bold: true };
  });

  const event = workbook.addWorksheet("Event");
  event.columns = [
    { header: "Setting", width: 42 },
    { header: "Value", width: 70 },
    { header: "Notes", width: 50 },
  ];
  styleHeader(event.getRow(1));
  EVENT_SETTINGS.forEach((setting, index) => {
    const row = event.getRow(index + 2);
    row.getCell(1).value = setting.label;
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PALE } };
    const cell = row.getCell(2);
    cell.value = formatCell(sheet.Event[setting.key], setting.kind);
    cell.numFmt = "@";
    cell.alignment = { wrapText: true, vertical: "top" };
    if (setting.kind === "bool") cell.dataValidation = { type: "list", allowBlank: true, formulae: [`"${YES},${NO}"`] };
    row.getCell(3).value = setting.help ?? "";
    row.getCell(3).font = { italic: true, color: { argb: "FF607168" } };
  });

  for (const [name, tab] of Object.entries(TABS)) {
    const worksheet = workbook.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1, xSplit: 1 }] });
    worksheet.columns = tab.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: WIDE.has(column.key) ? 48 : (WIDTHS[column.kind] ?? 20),
    }));
    styleHeader(worksheet.getRow(1));
    tab.columns.forEach((column, index) => {
      const note = [column.help, column.required ? "Required." : "Optional."].filter(Boolean).join(" ");
      worksheet.getCell(1, index + 1).note = note;
      // Plain-text columns stop Sheets turning codes like 6E6RC7 or times into numbers/dates.
      if (["text", "time", "date"].includes(column.kind)) worksheet.getColumn(index + 1).numFmt = "@";
      if (column.key.endsWith("Id") && column.header.includes("technical")) {
        worksheet.getColumn(index + 1).font = { color: { argb: "FF8A9590" } };
      }
    });
    for (const record of sheet[name]) {
      const row = worksheet.addRow(Object.fromEntries(tab.columns.map((column) => [column.key, formatCell(record[column.key], column.kind)])));
      row.alignment = { vertical: "top", wrapText: true };
    }
    tab.columns.forEach((column, index) => addValidation(worksheet, index + 1, sheet[name].length, column.kind, column.options));
  }

  return workbook;
}
