import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/renderApp";

vi.mock("../../hooks/useIsMobile", () => ({ useIsMobile: () => true }));
vi.mock("../../components/map/CampusMap", () => ({
  default: () => <div data-testid="campus-map" />,
}));

describe("map page on mobile", () => {
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
});
