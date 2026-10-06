import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { renderApp } from "../../test/renderApp";

describe("presentation reminder", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("stays hidden on other days", () => {
    renderApp("/?now=2026-10-14T09:40");

    expect(screen.queryByText(/program presentation (starts|is on)/i)).not.toBeInTheDocument();
  });

  it("counts down to the presentation on the home page", () => {
    renderApp("/?now=09:35");

    expect(screen.getByText("Live program presentation starts in 25 minutes")).toBeInTheDocument();
    expect(screen.getByText("10:00 AM · Room E1-001 · ETLC")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Directions" })).toHaveAttribute("href", "/map/campus");
  });

  it("says when the presentation is on, on the schedule page", () => {
    renderApp("/schedule?now=10:20");

    expect(screen.getByText("Live program presentation is on now · until 11:00 AM")).toBeInTheDocument();
  });

  it("disappears once the presentation ends", () => {
    renderApp("/schedule?now=11:05");

    expect(screen.queryByText(/program presentation is on now/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/program presentation starts in/i)).not.toBeInTheDocument();
  });

  it("can be dismissed", () => {
    renderApp("/?now=09:35");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss reminder" }));

    expect(screen.queryByText(/program presentation starts in/i)).not.toBeInTheDocument();
  });
});
