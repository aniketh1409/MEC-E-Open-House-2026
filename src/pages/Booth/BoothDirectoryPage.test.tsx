import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../../test/renderApp";

describe("booth directory", () => {
  it("shows active booths with their locations", () => {
    renderApp("/booths");

    expect(screen.getByText("16 stalls")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Undergraduate Design Courses" })).toBeInTheDocument();
    expect(screen.getByText("MEC E · Floor 2 · Room Main hall")).toBeInTheDocument();
  });

  it("searches by booth name and filters by category", () => {
    renderApp("/booths");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search stalls" }), {
      target: { value: "robotic" },
    });

    expect(screen.getByRole("heading", { name: "Autonomous Robotic Vehicle Project (ARVP)" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Undergraduate Design Courses" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search stalls" }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Category" }));
    fireEvent.click(screen.getByRole("option", { name: "Student Group" }));

    expect(screen.getByText("8 stalls")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Aero Design" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Undergraduate Design Courses" })).not.toBeInTheDocument();
  });

  it("shows an empty state when no booth matches", () => {
    renderApp("/booths");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search stalls" }), {
      target: { value: "not a booth" },
    });

    expect(screen.getByRole("heading", { name: "No stalls found" })).toBeInTheDocument();
  });
});

describe("booth details", () => {
  it("shows the selected booth and visit information", () => {
    renderApp("/booths/design-courses");

    expect(screen.getByRole("heading", { name: "Undergraduate Design Courses" })).toBeInTheDocument();
    expect(screen.getByText("Main hall")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to stalls" })).toHaveAttribute("href", "/booths");
  });

  it("handles unknown booth identifiers", () => {
    renderApp("/booths/unknown-booth");

    expect(screen.getByRole("heading", { name: "Stall not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to all stalls" })).toBeInTheDocument();
  });
});
