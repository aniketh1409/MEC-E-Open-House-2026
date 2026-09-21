import { describe, expect, it } from "vitest";
import {
  getActiveBoothById,
  getActiveBoothCategories,
  getActiveBooths,
} from "./content";

describe("content access", () => {
  it("joins active booths to their location and stamp", () => {
    const booth = getActiveBoothById("mece-design-01");

    expect(booth?.location.id).toBe("etlc-2-001");
    expect(booth?.stamp.id).toBe("stamp-design");
  });

  it("returns sorted booths and categories", () => {
    const booths = getActiveBooths();

    expect(booths[0]?.name).toBe("Autonomous Robotic Vehicle Project");
    expect(getActiveBoothCategories()).toEqual(["program", "research", "student-group"]);
  });

  it("does not return unknown booths", () => {
    expect(getActiveBoothById("unknown-booth")).toBeUndefined();
  });
});
