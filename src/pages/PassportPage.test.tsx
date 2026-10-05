import { beforeEach, describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { existsSync } from "node:fs";
import stamps from "../data/stamps.json";
import { getActiveBooths } from "../lib/content";
import { PASSPORT_STORAGE_KEY, savePassport } from "../lib/passport";
import { renderApp } from "../test/renderApp";

const allStampIds = getActiveBooths().map((booth) => booth.stamp.id);

describe("passport", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("has a sticker image file for every stamp", () => {
    expect(stamps.filter((stamp) => !existsSync(`public${stamp.image}`)).map((stamp) => stamp.image)).toEqual([]);
    expect(existsSync("public/assets/stamps/fallback.svg")).toBe(true);
    expect(existsSync("public/assets/stamps/certified-explorer.svg")).toBe(true);
  });

  it("starts with an anonymous empty passport", () => {
    renderApp("/passport");

    expect(screen.getByRole("heading", { name: "Passport" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "0 of 16 stamps collected" })).toBeInTheDocument();
    expect(screen.getAllByText("Visit to collect")).toHaveLength(16);
    expect(localStorage.getItem(PASSPORT_STORAGE_KEY)).not.toBeNull();
  });

  it("groups stickers by where they are collected", () => {
    renderApp("/passport");

    const campus = screen.getByRole("heading", { name: "On campus" }).closest("section")!;
    expect(within(campus).getByText("0 of 2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "MEC E · 2nd floor" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "MEC E · 3rd floor" })).toBeInTheDocument();
  });

  it("collects a sticker from a valid QR route", () => {
    renderApp("/passport/collect/design-courses");

    expect(screen.getByRole("heading", { name: "Sticker collected!" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Design Explorer sticker" })).toBeInTheDocument();
    expect(screen.getByText(/1 of 16 collected/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View passport" })).toHaveAttribute("href", "/passport?new=stamp-design-courses");

    const storedPassport = localStorage.getItem(PASSPORT_STORAGE_KEY);
    expect(storedPassport).toContain("stamp-design-courses");
  });

  it("does not duplicate an already collected stamp", () => {
    renderApp("/passport/collect/design-courses").unmount();
    renderApp("/passport/collect/design-courses");

    expect(screen.getByRole("heading", { name: "Already in your passport" })).toBeInTheDocument();
  });

  it("rejects an unknown QR code", () => {
    renderApp("/passport/collect/not-a-booth");

    expect(screen.getByRole("heading", { name: "QR code not recognized" })).toBeInTheDocument();
    expect(localStorage.getItem(PASSPORT_STORAGE_KEY)).toBeNull();
  });

  it("restores collected progress on a later visit", () => {
    renderApp("/passport/collect/design-courses").unmount();
    renderApp("/passport");

    expect(screen.getByRole("progressbar", { name: "1 of 16 stamps collected" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Design Explorer sticker" })).toBeInTheDocument();
  });

  it("celebrates the last sticker", () => {
    savePassport({ passportId: "test-passport", collectedStamps: allStampIds.filter((id) => id !== "stamp-mece-301-lab") });
    renderApp("/passport/collect/mece-301-lab");

    expect(screen.getByText(/16 of 16 collected/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "You're a Certified Explorer!" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "MEC E Certified Explorer seal" })).toBeInTheDocument();
  });

  it("shows the completed passport", () => {
    savePassport({ passportId: "test-passport", collectedStamps: allStampIds });
    renderApp("/passport");

    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "You're a Certified Explorer!" })).toBeInTheDocument();
  });
});
