import { fireEvent, screen, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCampusRouter } from "../../lib/loadCampusRouter";
import { renderApp } from "../../test/renderApp";

vi.mock("../../hooks/useIsMobile", () => ({ useIsMobile: () => true }));
vi.mock("../../components/map/CampusMap", () => ({
  default: ({ places }: { places?: unknown[] }) => <div data-testid="campus-map" data-places={places?.length ?? 0} />,
}));

describe("map page on mobile", () => {
  beforeAll(() => loadCampusRouter(), 30_000);

  beforeEach(() => {
    localStorage.clear();
  });

  it("shows the selected stop in the sheet's peek bar", () => {
    renderApp("/map/tour?at=arvp");

    const sheet = screen.getByRole("region", { name: "Stop details" });
    expect(within(sheet).getByRole("heading", { name: "Autonomous Robotic Vehicle Project (ARVP)" })).toBeInTheDocument();
    expect(within(sheet).getByText(/You are here · Tour stop 6 of 14/)).toBeInTheDocument();

    fireEvent.click(within(sheet).getAllByRole("button", { name: "Next stop" })[0]!);

    expect(within(sheet).getByRole("heading", { name: /MEC E 403/ })).toBeInTheDocument();
  });

  it("expands the sheet and collapses it after picking a stop from the list", () => {
    renderApp("/map/tour");

    const handle = screen.getByRole("button", { name: "Show details" });
    fireEvent.click(handle);
    expect(screen.getByRole("button", { name: "Hide details" })).toHaveAttribute("aria-expanded", "true");

    const list = screen.getByRole("navigation", { name: "Tour stops" });
    fireEvent.click(within(list).getByRole("button", { name: /UAARG/ }));

    expect(screen.getByRole("button", { name: "Show details" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "3rd floor, 9 stops to visit" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps nearby places in a Layers menu instead of over the map", async () => {
    renderApp("/map/campus");
    await screen.findByTestId("campus-map");

    expect(screen.queryByRole("checkbox", { name: "Parking" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Map layers" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: "Parking" }));

    expect(screen.getByTestId("campus-map").dataset.places).toBe("7");
  });

  it("shows the next campus step in the peek bar", async () => {
    renderApp("/map/campus");

    expect(await screen.findByTestId("campus-map")).toBeInTheDocument();
    const sheet = screen.getByRole("region", { name: "Your route" });
    expect(within(sheet).getByText("Start here")).toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: "Walking directions to VVC" })).toBeInTheDocument();
  });

  it("plans a campus route from the Where to? button", async () => {
    renderApp("/map/campus");
    await screen.findByTestId("campus-map");

    fireEvent.click(screen.getByRole("button", { name: "Where to?" }));
    expect(screen.getByRole("button", { name: "Hide details" })).toHaveAttribute("aria-expanded", "true");

    for (const [label, option] of [["From", "Van Vliet Complex (VVC)"], ["To", "Mechanical Engineering Building"]] as const) {
      const input = screen.getByRole("combobox", { name: label });
      fireEvent.click(input);
      const list = document.getElementById(input.getAttribute("aria-controls")!)!;
      fireEvent.click(await within(list).findByRole("option", { name: option, hidden: true }));
    }

    const sheet = screen.getByRole("region", { name: "Your route" });
    expect(await within(sheet).findByText(/^\d+ min · \d+ m$/, undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(within(sheet).getByText("Route to MEC E")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show details" })).toHaveAttribute("aria-expanded", "false");
  });
});
