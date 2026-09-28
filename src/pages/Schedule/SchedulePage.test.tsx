import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/renderApp";

describe("schedule page", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");
  });

  it("counts down before the Open House", () => {
    renderApp("/schedule?now=2026-10-14T09:00");

    expect(screen.getByRole("heading", { name: "Schedule" })).toBeInTheDocument();
    expect(screen.getByText("Saturday, October 17 · 9:00 AM – 3:00 PM")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Open House starts in 3 days" })).toBeInTheDocument();
    expect(screen.getByText("Draft schedule")).toBeInTheDocument();
  });

  it("shows what is happening now and next during the event", () => {
    renderApp("/schedule?now=10:15");

    const nowCard = screen.getByText("Happening now").closest("div")!;
    expect(within(nowCard).getByText("MEC E building tour")).toBeInTheDocument();
    expect(screen.getByText("Up next · 11:00 AM")).toBeInTheDocument();
    expect(screen.getByLabelText("Current time 10:15 AM")).toBeInTheDocument();
    expect(screen.getAllByText("Ended")).toHaveLength(1);
  });

  it("thanks visitors after the event", () => {
    renderApp("/schedule?now=16:00");

    expect(screen.getByRole("heading", { name: "Thanks for visiting Mechanical Engineering!" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See the stamps you collected" })).toHaveAttribute("href", "/passport");
  });

  it("filters the timeline by category", () => {
    renderApp("/schedule?now=2026-10-14T09:00");
    const timeline = screen.getByRole("list", { name: "Event timeline" });

    fireEvent.click(screen.getByRole("radio", { name: "Presentations" }));

    expect(within(timeline).getAllByRole("heading", { name: "MEC E program presentation" })).toHaveLength(3);
    expect(within(timeline).queryByRole("heading", { name: "Concession open" })).not.toBeInTheDocument();
  });

  it("links events to the map and to the visitor's calendar", () => {
    // jsdom has no object URLs, so provide them for this test.
    const createObjectURL = vi.fn(() => "blob:calendar");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    renderApp("/schedule?now=2026-10-14T09:00");

    expect(screen.getByRole("link", { name: "Show MEC E building tour on the map" })).toHaveAttribute(
      "href",
      "/map/tour?stop=west-entry",
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Concession open at 11:30 AM to your calendar" }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });
});
