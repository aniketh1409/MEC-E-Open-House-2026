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

    expect(booths[0]?.name).toBe("AlbertaSat");
    expect(getActiveBoothCategories()).toEqual(["event", "program", "research", "student-group", "welcome"]);
  });

  it("does not return unknown booths", () => {
    expect(getActiveBoothById("unknown-booth")).toBeUndefined();
    expect(getActiveBoothByQrCode("unknown-code")).toBeUndefined();
  });
});
