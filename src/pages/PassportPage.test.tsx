import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { existsSync } from "node:fs";
import stamps from "../data/stamps.json";
import { getRequiredBooths } from "../lib/content";
import { PASSPORT_STORAGE_KEY, savePassport } from "../lib/passport";
import boothsData from "../data/booths.json";
import { renderApp } from "../test/renderApp";

/** A stall's code, looked up so tests don't depend on the printed codes. */
const code = (boothId: string) => boothsData.find((booth) => booth.id === boothId)!.qrCode;

/** The stickers that complete the passport: every one except the bonus presentation sticker. */
const requiredStampIds = getRequiredBooths().map((booth) => booth.stamp.id);

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
    expect(screen.getByRole("progressbar", { name: "0 of 15 stamps collected" })).toBeInTheDocument();
    expect(screen.getAllByText("Visit to collect")).toHaveLength(15);
    expect(localStorage.getItem(PASSPORT_STORAGE_KEY)).not.toBeNull();
  });

  it("hides the reset button from visitors", () => {
    renderApp("/passport");

    expect(screen.queryByRole("button", { name: "Reset passport" })).not.toBeInTheDocument();
  });

  it("groups stickers by where they are collected", () => {
    renderApp("/passport");

    const campus = screen.getByRole("heading", { name: "On campus" }).closest("section")!;
    expect(within(campus).getByText("0 of 2")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "MEC E · 2nd floor" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "MEC E · 3rd floor" })).toBeInTheDocument();
  });

  it("collects a sticker from a valid QR route", () => {
    renderApp(`/passport/collect/${code("design-courses")}`);

    expect(screen.getByRole("heading", { name: "Sticker collected!" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Design Explorer sticker" })).toBeInTheDocument();
    expect(screen.getByText(/1 of 15 collected/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View passport" })).toHaveAttribute("href", "/passport?new=stamp-design-courses");

    const storedPassport = localStorage.getItem(PASSPORT_STORAGE_KEY);
    expect(storedPassport).toContain("stamp-design-courses");
  });

  it("does not duplicate an already collected stamp", () => {
    renderApp(`/passport/collect/${code("design-courses")}`).unmount();
    renderApp(`/passport/collect/${code("design-courses")}`);

    expect(screen.getByRole("heading", { name: "Already in your passport" })).toBeInTheDocument();
  });

  it("rejects an unknown QR code", () => {
    renderApp("/passport/collect/not-a-booth");

    expect(screen.getByRole("heading", { name: "QR code not recognized" })).toBeInTheDocument();
    expect(localStorage.getItem(PASSPORT_STORAGE_KEY)).toBeNull();
  });

  it("restores collected progress on a later visit", () => {
    renderApp(`/passport/collect/${code("design-courses")}`).unmount();
    renderApp("/passport");

    expect(screen.getByRole("progressbar", { name: "1 of 15 stamps collected" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Design Explorer sticker" })).toBeInTheDocument();
  });

  it("celebrates the last sticker", () => {
    savePassport({ passportId: "test-passport", collectedStamps: requiredStampIds.filter((id) => id !== "stamp-mece-301-lab") });
    renderApp(`/passport/collect/${code("mece-301-lab")}`);

    expect(screen.getByText(/15 of 15 collected/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "You're a Certified Explorer!" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "MEC E Certified Explorer seal" })).toBeInTheDocument();
  });

  it("shows the completed passport, without the bonus sticker", () => {
    savePassport({ passportId: "test-passport", collectedStamps: requiredStampIds });
    renderApp("/passport");

    expect(screen.getByText("Complete")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "You're a Certified Explorer!" })).toBeInTheDocument();
  });

  it("marks the presentation sticker as an optional bonus", () => {
    renderApp("/passport");

    const campus = screen.getByRole("heading", { name: "On campus" }).closest("section")!;
    expect(within(campus).getByText("Bonus")).toBeInTheDocument();
    expect(within(campus).getByText("Optional: not needed to complete")).toBeInTheDocument();
    expect(screen.getByText(/bonus stickers are optional/)).toBeInTheDocument();
  });

  it("shows the Sticker Challenge notice, linking to the contest rules", () => {
    renderApp("/passport");

    const notice = screen.getByRole("region", { name: "Mechanical Engineering Open House Sticker Challenge" });
    expect(within(notice).getByText(/all required stickers/)).toBeInTheDocument();
    fireEvent.click(within(notice).getByRole("link", { name: "contest rules page" }));

    expect(screen.getByRole("heading", { level: 1, name: "Mechanical Engineering Open House Sticker Challenge" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "5. Skill-Testing Question" })).toBeInTheDocument();
    expect(screen.getByText(/3:00 p.m. Mountain Time on October 17, 2026/)).toBeInTheDocument();
  });

  it("hides the Sticker Challenge notice once the visitor has entered", () => {
    localStorage.setItem("mece-open-house-draw-v1", JSON.stringify({ name: "Alex", email: "alex@example.com", code: "3F9A-2C1E", submittedAt: "", status: "sent" }));
    renderApp("/passport");

    expect(screen.queryByRole("region", { name: "Mechanical Engineering Open House Sticker Challenge" })).not.toBeInTheDocument();
  });

  it("collects the bonus sticker without counting it", () => {
    renderApp(`/passport/collect/${code("program-presentation")}`);

    expect(screen.getByRole("heading", { name: "Bonus sticker collected!" })).toBeInTheDocument();
    expect(screen.getByText(/0 of 15 collected/)).toBeInTheDocument();
    expect(localStorage.getItem(PASSPORT_STORAGE_KEY)).toContain("stamp-program-presentation");
  });

  it("doesn't replay the completion for a bonus sticker collected afterwards", () => {
    savePassport({ passportId: "test-passport", collectedStamps: requiredStampIds });
    renderApp(`/passport/collect/${code("program-presentation")}`);

    expect(screen.getByRole("heading", { name: "Bonus sticker collected!" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "You're a Certified Explorer!" })).not.toBeInTheDocument();
  });
});
