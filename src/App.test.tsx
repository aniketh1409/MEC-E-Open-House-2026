import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "./test/renderApp";

describe("App", () => {
  it("renders the requested route inside the shared layout", () => {
    renderApp("/passport");

    expect(screen.getByRole("heading", { name: "Passport" })).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: "Primary navigation" })).toHaveLength(2);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("renders the complete help and support page", () => {
    renderApp("/help");

    expect(screen.getByRole("heading", { name: "Help & Support" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Event Questions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Safety & Emergencies" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Map" })).toHaveAttribute("href", "/map");
    expect(screen.getByRole("link", { name: "View PDF Map" })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(screen.getByRole("link", { name: "View PDF Map" })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(screen.getAllByRole("region")).toHaveLength(5);
  });
});
