import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCampusRouter } from "../../lib/loadCampusRouter";
import { renderApp } from "../../test/renderApp";

vi.mock("../../components/map/CampusMap", () => ({
  default: ({ plannedRoute }: { plannedRoute?: { route?: { path: unknown[] } } }) => (
    <div data-testid="campus-map" data-route-points={plannedRoute?.route?.path.length ?? 0} />
  ),
}));

/** Loading and indexing the campus walking network can take a few seconds under a busy test run. */
const ROUTE_TIMEOUT = { timeout: 5000 };

/**
 * Picks a dropdown option. jsdom has no layout, so Mantine's positioning keeps
 * this page's dropdowns display:none in tests; the options still respond to clicks.
 */
async function choose(label: string, option: string) {
  const input = screen.getByRole("combobox", { name: label });
  fireEvent.click(input);
  const list = document.getElementById(input.getAttribute("aria-controls")!)!;
  fireEvent.click(await within(list).findByRole("option", { name: option, hidden: true }));
}

/** jsdom has no geolocation; install a fake one for a test. */
function fakeGeolocation(watchPosition: Geolocation["watchPosition"]) {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { watchPosition, clearWatch: vi.fn() },
  });
}

describe("campus directions", () => {
  // Load and index the walking network once, up front, instead of inside the first test.
  beforeAll(() => loadCampusRouter(), 30_000);

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "geolocation");
  });

  it("gives turn-by-turn walking directions between buildings", async () => {
    renderApp("/map/campus");
    await screen.findByTestId("campus-map");

    await choose("From", "Butterdome (Universiade Pavilion)");
    await choose("To", "Mechanical Engineering Building");

    expect(await screen.findByText("Arrive at Mechanical Engineering Building", undefined, ROUTE_TIMEOUT)).toBeInTheDocument();
    expect(screen.getByText("9 min")).toBeInTheDocument();
    expect(screen.getByText("Head west along 87 Avenue NW")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google Maps" })).toHaveAttribute("href", expect.stringContaining("destination=53.527965,-113.527887"));
    expect(Number(screen.getByTestId("campus-map").dataset.routePoints)).toBeGreaterThan(10);
  });

  it("routes from the visitor's live location", async () => {
    const watchPosition = vi.fn((onSuccess: PositionCallback) => {
      onSuccess({ coords: { latitude: 53.5248, longitude: -113.5283, accuracy: 8 } } as GeolocationPosition);
      return 1;
    });
    fakeGeolocation(watchPosition);
    renderApp("/map/campus");
    await screen.findByTestId("campus-map");

    await choose("To", "Engineering Teaching and Learning Complex");

    expect(watchPosition).toHaveBeenCalled();
    expect(await screen.findByText("Arrive at Engineering Teaching and Learning Complex", undefined, ROUTE_TIMEOUT)).toBeInTheDocument();
  });

  it("explains when the phone can't share its location", async () => {
    const watchPosition = vi.fn((_: PositionCallback, onError?: PositionErrorCallback | null) => {
      onError?.({ code: 1 } as GeolocationPositionError);
      return 1;
    });
    fakeGeolocation(watchPosition);
    renderApp("/map/campus");
    await screen.findByTestId("campus-map");

    await choose("To", "Mechanical Engineering Building");

    expect(await screen.findByText(/Choose a starting building instead/)).toBeInTheDocument();
  });

  it("clears the route", async () => {
    renderApp("/map/campus");
    await screen.findByTestId("campus-map");
    await choose("From", "Butterdome (Universiade Pavilion)");
    await choose("To", "Engineering Teaching and Learning Complex");
    await screen.findByText("Arrive at Engineering Teaching and Learning Complex", undefined, ROUTE_TIMEOUT);

    fireEvent.click(screen.getByRole("button", { name: "Clear route" }));

    expect(screen.queryByText("Arrive at Engineering Teaching and Learning Complex")).not.toBeInTheDocument();
    expect(within(screen.getByRole("combobox", { name: "To" }).closest("div")!).queryByDisplayValue(/Engineering/)).toBeNull();
  });
});
