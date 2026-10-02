import { fireEvent, screen, within } from "@testing-library/react";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderApp } from "../test/renderApp";

describe("404 page", () => {
  it("shows a friendly page for addresses that don't exist", () => {
    renderApp("/ds");

    expect(screen.getByRole("heading", { name: "This room isn't on the floor plan." })).toBeInTheDocument();
    expect(screen.getByText("/ds")).toBeInTheDocument();
    const page = screen.getByRole("region", { name: "This room isn't on the floor plan." });
    expect(within(page).getByRole("link", { name: "Map" })).toHaveAttribute("href", "/map");
    expect(within(page).getByRole("link", { name: "Stalls" })).toHaveAttribute("href", "/booths");
  });

  it("spins the gears when tapped", () => {
    renderApp("/nowhere");

    fireEvent.click(screen.getByRole("button", { name: "Spin the gears" }));

    expect(screen.getByText("Fixing it…")).toBeInTheDocument();
  });

  it("leaves real pages and QR links alone", () => {
    renderApp("/passport/collect/not-a-booth");

    expect(screen.getByRole("heading", { name: "QR code not recognized" })).toBeInTheDocument();
    expect(screen.queryByText(/isn't on the floor plan/)).not.toBeInTheDocument();
  });

  it("tells Vercel to load the app for every address, so deep links and QR codes work", () => {
    expect(existsSync("vercel.json")).toBe(true);
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as { rewrites: { source: string; destination: string }[] };
    expect(config.rewrites).toContainEqual({ source: "/(.*)", destination: "/index.html" });
  });
});
