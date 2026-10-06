import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readData } from "./dataFiles.mjs";
import { hashQrPassword } from "./password.mjs";
import { fromSheet, toSheet } from "./sheetFormat.mjs";
import { validateSheet } from "./validate.mjs";
import { buildWorkbook, readWorkbook } from "./workbook.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const data = readData(root);
const byId = (rows) => [...rows].sort((first, second) => first.id.localeCompare(second.id));

async function roundTrip(edit) {
  const workbook = buildWorkbook(toSheet(data));
  if (edit) edit(workbook);
  const { sheet, errors } = await readWorkbook(await workbook.xlsx.writeBuffer());
  return { sheet, errors: [...errors, ...(errors.length ? [] : validateSheet(sheet, root, data))] };
}

/** Finds the row on a tab whose first column matches, for editing a cell in a test. */
function row(workbook, tab, id) {
  let found;
  workbook.getWorksheet(tab).eachRow((candidate) => {
    if (candidate.getCell(1).value === id) found = candidate;
  });
  return found;
}

const column = (workbook, tab, header) => {
  let index;
  workbook.getWorksheet(tab).getRow(1).eachCell((cell, number) => {
    if (cell.value === header) index = number;
  });
  return index;
};

describe("content spreadsheet", () => {
  it("turns the current data into a sheet and back without losing anything", async () => {
    const { sheet, errors } = await roundTrip();
    expect(errors).toEqual([]);

    const back = fromSheet(sheet, data);
    for (const name of ["event", "tour", "schedule", "booths", "faq", "places"]) {
      expect(back[name]).toEqual(data[name]);
    }
    expect(byId(back.stamps)).toEqual(byId(data.stamps));
    expect(byId(back.locations)).toEqual(byId(data.locations));
  });

  it("reads times and dates that Google Sheets has turned into its own time values", async () => {
    const { sheet, errors } = await roundTrip((workbook) => {
      const target = row(workbook, "Schedule", "building-tour");
      target.getCell(column(workbook, "Schedule", "Starts")).value = 11 / 24; // 11:00 as a fraction of a day
      target.getCell(column(workbook, "Schedule", "Ends")).value = new Date(Date.UTC(1899, 11, 30, 14, 0));
    });

    expect(errors).toEqual([]);
    const tour = sheet.Schedule.find((item) => item.id === "building-tour");
    expect([tour.start, tour.end]).toEqual(["11:00", "14:00"]);
  });

  it("names the tab and row of every problem, and lets nothing through", async () => {
    const { errors } = await roundTrip((workbook) => {
      const presentation = row(workbook, "Schedule", "program-presentation");
      presentation.getCell(column(workbook, "Schedule", "Starts")).value = "25:00";
      const aero = row(workbook, "Stalls", "aero-design");
      aero.getCell(column(workbook, "Stalls", "Code")).value = data.booths.find((booth) => booth.id === "arvp").qrCode;
      aero.getCell(column(workbook, "Stalls", "Active?")).value = "maybe";
      workbook.getWorksheet("Tour").addRow(["not-a-stall", "Somewhere"]);
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Schedule tab, row \d+ \(Starts\): should be a 24-hour time like 10:00/),
        expect.stringMatching(/^Stalls tab, row \d+ \(Active\?\): should be Yes or No/),
      ]),
    );
  });

  it("catches broken links between tabs once the cells themselves are fine", async () => {
    const { errors } = await roundTrip((workbook) => {
      const aero = row(workbook, "Stalls", "aero-design");
      aero.getCell(column(workbook, "Stalls", "Code")).value = data.booths.find((booth) => booth.id === "arvp").qrCode;
      workbook.getWorksheet("Tour").addRow(["not-a-stall", "Somewhere"]);
      const presentation = row(workbook, "Schedule", "program-presentation");
      presentation.getCell(column(workbook, "Schedule", "Ends")).value = "16:30";
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Stalls tab, row \d+: Code ".+" is already used on row \d+\.$/),
        expect.stringMatching(/^Tour tab, row \d+: Stall ID "not-a-stall" isn't on the Stalls tab\.$/),
        expect.stringMatching(/^Schedule tab, row \d+: 10:00–16:30 is outside the event hours/),
      ]),
    );
  });

  it("stores only a fingerprint of a new QR page password, and keeps the old one when blank", async () => {
    const setRow = (workbook, value) =>
      workbook.getWorksheet("Event").eachRow((candidate) => {
        if (candidate.getCell(1).value === "QR codes page password") candidate.getCell(2).value = value;
      });

    const changed = await roundTrip((workbook) => setRow(workbook, "a-new-password"));
    expect(changed.errors).toEqual([]);
    const event = fromSheet(changed.sheet, data).event;
    expect(event.qrPagePasswordHash).toBe(hashQrPassword("a-new-password"));
    expect(JSON.stringify(event)).not.toContain("a-new-password");

    const blank = await roundTrip();
    expect(fromSheet(blank.sheet, data).event.qrPagePasswordHash).toBe(data.event.qrPagePasswordHash);

    const short = await roundTrip((workbook) => setRow(workbook, "short"));
    expect(short.errors).toContain('Event tab: "QR codes page password" must be at least 8 characters.');
  });

  it("ignores extra note columns and blank rows editors add", async () => {
    const { sheet, errors } = await roundTrip((workbook) => {
      const stalls = workbook.getWorksheet("Stalls");
      const notes = stalls.columnCount + 1;
      stalls.getCell(1, notes).value = "Notes for the team";
      stalls.getCell(2, notes).value = "Ask about a bigger table";
      stalls.addRow([]);
    });

    expect(errors).toEqual([]);
    expect(sheet.Stalls).toHaveLength(data.booths.length);
  });
});

