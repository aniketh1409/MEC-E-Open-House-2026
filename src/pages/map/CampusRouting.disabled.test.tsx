import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/renderApp";

vi.mock("../../config/features", () => ({ features: { campusRouting: false } }));
vi.mock("../../components/map/CampusMap", () => ({
  default: () => <div data-testid="campus-map" />,
}));

describe("campus directions switched off", () => {
  it("shows the original journey without the Where to? planner", async () => {
    renderApp("/map/campus");

    expect(await screen.findByTestId("campus-map")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Start at the Butterdome" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Where to?" })).not.toBeInTheDocument();
  });
});
