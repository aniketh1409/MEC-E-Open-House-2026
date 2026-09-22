import { beforeEach, describe, expect, it } from "vitest";
import {
  PASSPORT_STORAGE_KEY,
  addStamp,
  loadPassport,
  resetPassport,
  savePassport,
} from "./passport";

describe("local passport storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates and restores an anonymous passport", () => {
    const firstLoad = loadPassport();
    const secondLoad = loadPassport();

    expect(firstLoad.isPersistent).toBe(true);
    expect(firstLoad.state.passportId).toBeTruthy();
    expect(secondLoad.state).toEqual(firstLoad.state);
  });

  it("adds each stamp only once", () => {
    const passport = loadPassport().state;
    const firstScan = addStamp(passport, "stamp-design");
    const secondScan = addStamp(firstScan.state, "stamp-design");

    expect(firstScan.added).toBe(true);
    expect(secondScan.added).toBe(false);
    expect(secondScan.state.collectedStamps).toEqual(["stamp-design"]);
  });

  it("persists collected stamps across loads", () => {
    const passport = loadPassport().state;
    const collection = addStamp(passport, "stamp-design");

    expect(savePassport(collection.state)).toBe(true);
    expect(loadPassport().state.collectedStamps).toEqual(["stamp-design"]);
  });

  it("recovers from malformed stored data", () => {
    localStorage.setItem(PASSPORT_STORAGE_KEY, "not-json");

    const recovered = loadPassport();

    expect(recovered.state.passportId).toBeTruthy();
    expect(recovered.state.collectedStamps).toEqual([]);
  });

  it("reset creates a new empty passport", () => {
    const original = loadPassport().state;
    const replacement = resetPassport().state;

    expect(replacement.passportId).not.toBe(original.passportId);
    expect(replacement.collectedStamps).toEqual([]);
  });
});
