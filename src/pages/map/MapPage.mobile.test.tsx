import { fireEvent, screen, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { loadCampusRouter } from "../../lib/loadCampusRouter";
import { renderApp } from "../../test/renderApp";

vi.mock("../../hooks/useIsMobile", () => ({ useIsMobile: () => true }));
vi.mock("../../components/map/CampusMap", () => ({
  default: () => <div data-testid="campus-map" />,
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
    expect(within(sheet).getByText(/You are here · Stop 3 of 12/)).toBeInTheDocument();

    fireEvent.click(within(sheet).getAllByRole("button", { name: "Next stop" })[0]!);

    expect(within(sheet).getByRole("heading", { name: "EcoCar" })).toBeInTheDocument();
  });

  it("expands the sheet and collapses it after picking a stop from the list", () => {
    renderApp("/map/tour");

    const handle = screen.getByRole("button", { name: "Show details" });
    fireEvent.click(handle);
    expect(screen.getByRole("button", { name: "Hide details" })).toHaveAttribute("aria-expanded", "true");

    const list = screen.getByRole("navigation", { name: "Tour stops" });
    fireEvent.click(within(list).getByRole("button", { name: /AlbertaSat/ }));

    expect(screen.getByRole("button", { name: "Show details" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "3rd floor, 7 stops to visit" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the next campus step in the peek bar", async () => {
    renderApp("/map/campus");

    expect(await screen.findByTestId("campus-map")).toBeInTheDocument();
    const sheet = screen.getByRole("region", { name: "Your route" });
    expect(within(sheet).getByText("Start here")).toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: "Walking directions to Butterdome" })).toBeInTheDocument();
  });

  it("plans a campus route from the Where to? button", async () => {
    renderApp("/map/campus");
    await screen.findByTestId("campus-map");

    fireEvent.click(screen.getByRole("button", { name: "Where to?" }));
    expect(screen.getByRole("button", { name: "Hide details" })).toHaveAttribute("aria-expanded", "true");

    for (const [label, option] of [["From", "Butterdome (Universiade Pavilion)"], ["To", "Mechanical Engineering Building"]] as const) {
      const input = screen.getByRole("combobox", { name: label });
      fireEvent.click(input);
      const list = document.getElementById(input.getAttribute("aria-controls")!)!;
      fireEvent.click(await within(list).findByRole("option", { name: option, hidden: true }));
    }

    const sheet = screen.getByRole("region", { name: "Your route" });
    expect(await within(sheet).findByText(/^9 min · 70\d m$/, undefined, { timeout: 5000 })).toBeInTheDocument();
    expect(within(sheet).getByText("Route to MEC E")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show details" })).toHaveAttribute("aria-expanded", "false");
  });
});
