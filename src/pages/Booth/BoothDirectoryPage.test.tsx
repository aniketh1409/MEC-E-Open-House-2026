import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../../test/renderApp";

describe("booth directory", () => {
  it("shows active booths with their locations", () => {
    renderApp("/booths");

    expect(screen.getByText("6 booths")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mechanical Design Showcase" })).toBeInTheDocument();
    expect(screen.getByText("ETLC · Floor 2 · Room 2-001")).toBeInTheDocument();
  });

  it("searches by booth name and filters by category", () => {
    renderApp("/booths");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search booths" }), {
      target: { value: "robotics" },
    });

    expect(screen.getByRole("heading", { name: "Robotics and Automation" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mechanical Design Showcase" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search booths" }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("combobox", { name: "Category" }));
    fireEvent.click(screen.getByRole("option", { name: "Student Group" }));

    expect(screen.getByText("2 booths")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "EcoCar" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Energy Systems Lab" })).not.toBeInTheDocument();
  });

  it("shows an empty state when no booth matches", () => {
    renderApp("/booths");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search booths" }), {
      target: { value: "not a booth" },
    });

    expect(screen.getByRole("heading", { name: "No booths found" })).toBeInTheDocument();
  });
});

describe("booth details", () => {
  it("shows the selected booth and visit information", () => {
    renderApp("/booths/mece-design-01");

    expect(screen.getByRole("heading", { name: "Mechanical Design Showcase" })).toBeInTheDocument();
    expect(screen.getByText("2-001")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to booths" })).toHaveAttribute("href", "/booths");
  });

  it("handles unknown booth identifiers", () => {
    renderApp("/booths/unknown-booth");

    expect(screen.getByRole("heading", { name: "Booth not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to all booths" })).toBeInTheDocument();
  });
});
