import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "./test/renderApp";

describe("App", () => {
  it("renders the requested route inside the shared layout", () => {
    renderApp("/passport");

    expect(screen.getByRole("heading", { name: "Passport" })).toBeInTheDocument();
    expect(screen.getAllByRole("navigation", { name: "Primary navigation" })).toHaveLength(2);
  });
});
