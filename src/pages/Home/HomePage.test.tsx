import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../../test/renderApp";

describe("home page", () => {
  it("shows the headline and the main call to action", () => {
    renderApp("/");

    expect(screen.getByRole("heading", { level: 1, name: "Mechanical Engineering Open House" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "The Open House that opens doors." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore the Open House" })).toHaveAttribute("href", "/booths");
  });

  it("counts down to opening time", () => {
    renderApp("/?now=2026-09-28T06:30");

    expect(screen.getByRole("timer")).toHaveAccessibleName("19 days, 2 hours and 30 minutes until the Open House");
    expect(screen.getByRole("timer").nextElementSibling).toHaveTextContent("Saturday, October 17 · 9:00 AM – 3:00 PM");
  });

  it("uses singular units when one is left", () => {
    renderApp("/?now=2026-10-16T07:59");

    expect(screen.getByRole("timer")).toHaveAccessibleName("1 day, 1 hour and 1 minute until the Open House");
  });

  it("says the doors are open on the day", () => {
    renderApp("/?now=10:15");

    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(screen.getByText("Doors are open until 3:00 PM")).toBeInTheDocument();
  });

  it("thanks visitors after the event", () => {
    renderApp("/?now=2026-10-17T16:00");

    expect(screen.getByText("Thanks for coming to Open House 2026!")).toBeInTheDocument();
  });
});
