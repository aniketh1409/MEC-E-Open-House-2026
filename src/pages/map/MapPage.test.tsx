import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PASSPORT_STORAGE_KEY } from "../../lib/passport";
import { renderApp } from "../../test/renderApp";

// Leaflet needs a real browser layout, so the campus map itself is stubbed.
vi.mock("../../components/map/CampusMap", () => ({
  default: () => <div data-testid="campus-map" />,
}));

function collect(...stampIds: string[]) {
  localStorage.setItem(
    PASSPORT_STORAGE_KEY,
    JSON.stringify({ version: 1, passportId: "test-passport", collectedStamps: stampIds }),
  );
}

describe("map page", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the campus journey with the optional presentation", async () => {
    renderApp("/map");

    expect(screen.getByRole("heading", { name: "Event map" })).toBeInTheDocument();
    expect(await screen.findByTestId("campus-map")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Program presentation" })).toBeInTheDocument();
    expect(screen.getByText("8 min walk · 573 m")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /attending the MEC E program presentation/ }));

    expect(screen.queryByRole("heading", { name: "Program presentation" })).not.toBeInTheDocument();
    expect(screen.getByText("8 min walk · 636 m")).toBeInTheDocument();
  });

  it("opens the tour on the first unvisited stop", () => {
    collect("stamp-west-entry");
    renderApp("/map/tour");

    expect(screen.getByText("1 of 14 stops visited")).toBeInTheDocument();
    expect(screen.getByText("2nd floor: 1 of 5 here")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Undergraduate Design Courses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop 1: Tour Start – West Entry, visited" })).toBeInTheDocument();
  });

  it("marks the scanned stop as the visitor's position", () => {
    renderApp("/map/tour?at=arvp");

    const card = screen.getByRole("heading", { name: "Autonomous Robotic Vehicle Project (ARVP)" }).closest("div")!;
    expect(within(card.parentElement!).getByText("You are here")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop 3: Autonomous Robotic Vehicle Project (ARVP), you are here" })).toBeInTheDocument();
    expect(screen.getByText("EcoCar is just across the hallway, to your right.")).toBeInTheDocument();
  });

  it("moves to the next floor when stepping past the last stop on a floor", () => {
    renderApp("/map/tour?stop=formula-racing");

    expect(screen.getByText("Next: Stop 6 · 3rd floor")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next stop" }));

    expect(screen.getByRole("heading", { name: /MEC E 403/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Stop 6: MEC E 403/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Stop 5: UAlberta Formula Racing/ })).not.toBeInTheDocument();
  });

  it("shows the way up from the entrance before the first stop", () => {
    renderApp("/map/tour");

    expect(screen.getByText(/through the south-west doors, or through the north doors/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show the 1st floor" }));

    expect(screen.getByRole("button", { name: "1st floor, all stops visited" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("1st floor: no stops, just passing through")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "1st floor plan of the Mechanical Engineering Building" })).toBeInTheDocument();
  });

  it("offers the next floor's plan when the next stop is upstairs", () => {
    renderApp("/map/tour?stop=formula-racing");

    fireEvent.click(screen.getByRole("button", { name: "Show the 3rd floor" }));

    expect(screen.getByRole("group", { name: "3rd floor plan of the Mechanical Engineering Building" })).toBeInTheDocument();
    expect(screen.getByText("3rd floor: 0 of 7 here")).toBeInTheDocument();
  });

  it("selects a stop from the stop list", () => {
    renderApp("/map/tour");

    const list = screen.getByRole("navigation", { name: "Tour stops" });
    fireEvent.click(within(list).getByRole("button", { name: /AlbertaSat/ }));

    expect(screen.getByRole("heading", { name: "AlbertaSat" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About this stop" })).toHaveAttribute("href", "/booths/albertasat");
  });

  it("links from a collected stamp to the map", () => {
    renderApp("/passport/collect/ecocar");

    expect(screen.getByRole("link", { name: "Find your next stop" })).toHaveAttribute("href", "/map/tour?at=ecocar");
  });

  it("opens the tour instead of campus directions once a tour stamp is collected", () => {
    collect("stamp-open-house-booth", "stamp-arvp");
    renderApp("/map");

    expect(screen.getByRole("tab", { name: "MEC E tour" })).toHaveAttribute("aria-selected", "true");
    // Campus stamps count too, matching the Passport's total.
    expect(screen.getByText("2 of 14 stops visited")).toBeInTheDocument();
  });

  it("returns scans started from the map straight back to it", () => {
    renderApp("/passport/collect/ecocar?from=map");

    expect(screen.getByText("Stamp collected!")).toBeInTheDocument();
    expect(screen.getByText("Efficiency Engineer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop 4: EcoCar, visited, you are here" })).toBeInTheDocument();
  });

  it("offers the scanner from the map", () => {
    renderApp("/map/tour");

    expect(screen.getByRole("link", { name: "Scan stamp" })).toHaveAttribute("href", "/passport/scan?from=map");
  });
});
