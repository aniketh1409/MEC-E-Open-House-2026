import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { PASSPORT_STORAGE_KEY } from "../lib/passport";
import { renderApp } from "../test/renderApp";

describe("passport", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with an anonymous empty passport", () => {
    renderApp("/passport");

    expect(screen.getByRole("heading", { name: "Passport" })).toBeInTheDocument();
    expect(screen.getByText("0 of 14 stamps")).toBeInTheDocument();
    expect(screen.getAllByText("Locked")).toHaveLength(14);
    expect(localStorage.getItem(PASSPORT_STORAGE_KEY)).not.toBeNull();
  });

  it("collects a stamp from a valid QR route", () => {
    renderApp("/passport/collect/design-courses");

    expect(screen.getByRole("heading", { name: "Stamp collected" })).toBeInTheDocument();
    expect(screen.getByText("Design Explorer")).toBeInTheDocument();

    const storedPassport = localStorage.getItem(PASSPORT_STORAGE_KEY);
    expect(storedPassport).toContain("stamp-design-courses");
  });

  it("does not duplicate an already collected stamp", () => {
    renderApp("/passport/collect/design-courses").unmount();
    renderApp("/passport/collect/design-courses");

    expect(screen.getByRole("heading", { name: "Stamp already collected" })).toBeInTheDocument();
  });

  it("rejects an unknown QR code", () => {
    renderApp("/passport/collect/not-a-booth");

    expect(screen.getByRole("heading", { name: "QR code not recognized" })).toBeInTheDocument();
    expect(localStorage.getItem(PASSPORT_STORAGE_KEY)).toBeNull();
  });

  it("restores collected progress on a later visit", () => {
    renderApp("/passport/collect/design-courses").unmount();
    renderApp("/passport");

    expect(screen.getByText("1 of 14 stamps")).toBeInTheDocument();
    expect(screen.getByText("Design Explorer")).toBeInTheDocument();
  });
});
