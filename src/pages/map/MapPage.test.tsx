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
    expect(screen.getByRole("heading", { name: "MEC E program presentation" })).toBeInTheDocument();
    expect(screen.getByText("8 min walk · 560 m")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: /attending the MEC E program presentation/ }));

    expect(screen.queryByRole("heading", { name: "MEC E program presentation" })).not.toBeInTheDocument();
    expect(screen.getByText("9 min walk · 705 m")).toBeInTheDocument();
  });

  it("opens the tour on the first unvisited stop", () => {
    collect("stamp-west-entry");
    renderApp("/map/tour");

    expect(screen.getByText("1 of 12 stops visited")).toBeInTheDocument();
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
});
