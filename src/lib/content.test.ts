import { describe, expect, it } from "vitest";
import {
  getActiveBoothById,
  getActiveBoothByQrCode,
  getActiveBoothCategories,
  getActiveBooths,
} from "./content";

describe("content access", () => {
  it("joins active booths to their location and stamp", () => {
    const booth = getActiveBoothById("design-courses");

    expect(booth?.location.id).toBe("mece-design-courses");
    expect(booth?.stamp.id).toBe("stamp-design-courses");
  });

  it("returns sorted booths and categories", () => {
    const booths = getActiveBooths();

    expect(booths[0]?.name).toBe("Aero Design");
    expect(getActiveBoothCategories()).toEqual(["event", "program", "research", "student-group", "welcome"]);
  });

  it("does not return unknown booths", () => {
    expect(getActiveBoothById("unknown-booth")).toBeUndefined();
    expect(getActiveBoothByQrCode("unknown-code")).toBeUndefined();
  });
});

describe("stall codes", () => {
  it("are six capital letters and digits, and match however they're typed", () => {
    const booth = getActiveBoothById("design-courses")!;
    expect(booth.qrCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    expect(getActiveBoothByQrCode(booth.qrCode)?.id).toBe("design-courses");
    expect(getActiveBoothByQrCode(booth.qrCode.toLowerCase())?.id).toBe("design-courses");
    expect(getActiveBoothByQrCode(` ${booth.qrCode.slice(0, 3)}-${booth.qrCode.slice(3)} `)?.id).toBe("design-courses");
  });

  it("no longer accepts the old name-based codes", () => {
    expect(getActiveBoothByQrCode("design-courses")).toBeUndefined();
    expect(getActiveBoothByQrCode("ecocar")).toBeUndefined();
  });
});
