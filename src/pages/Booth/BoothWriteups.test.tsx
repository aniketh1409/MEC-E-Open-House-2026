import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getActiveBooths } from "../../lib/content";
import { renderApp } from "../../test/renderApp";

describe("student group write-ups", () => {
  it("gives every student group a logo", () => {
    const groups = getActiveBooths().filter((booth) => booth.category === "student-group");

    expect(groups).toHaveLength(7);
    expect(groups.filter((booth) => !booth.logoUrl).map((booth) => booth.id)).toEqual([]);
  });

  it("shows only the first paragraph on the booth card", () => {
    renderApp("/booths");

    const card = screen.getByRole("heading", { name: "UAlberta Formula Racing" }).closest("li")!;
    expect(within(card).getByRole("img", { name: "UAlberta Formula Racing logo" })).toBeInTheDocument();
    expect(within(card).getByText(/The club has been running since 1998/)).toBeInTheDocument();
    expect(within(card).queryByText(/The car is electric/)).not.toBeInTheDocument();
  });

  it("shows the full write-up on the booth page", () => {
    renderApp("/booths/formula-racing");

    expect(screen.getByRole("img", { name: "UAlberta Formula Racing logo" })).toBeInTheDocument();
    expect(screen.getByText(/The club has been running since 1998/)).toBeInTheDocument();
    expect(screen.getByText(/The car is electric/)).toBeInTheDocument();
    expect(screen.getByText(/You just need to want to build something/)).toBeInTheDocument();
  });
});
