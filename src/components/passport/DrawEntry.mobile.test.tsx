import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getActiveBooths } from "../../lib/content";
import { savePassport } from "../../lib/passport";
import { renderApp } from "../../test/renderApp";

vi.mock("../../hooks/useIsMobile", () => ({ useIsMobile: () => true }));
vi.mock("../../lib/schedule", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/schedule")>();
  return { ...actual, getEventInfo: () => ({ ...actual.getEventInfo(), drawEndpoint: "https://script.google.com/macros/s/test/exec" }) };
});

const stampIds = getActiveBooths().map((booth) => booth.stamp.id);

describe("prize draw entry on a phone", () => {
  beforeEach(() => {
    localStorage.clear();
    savePassport({ passportId: "3f9a2c1e-7b44-4d2a-9c1d-5e6f7a8b9c0d", collectedStamps: stampIds });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: true, status: "created" })))));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens the form with phone-friendly fields and no keyboard straight away", async () => {
    renderApp("/passport?now=13:00");
    fireEvent.click(screen.getByRole("button", { name: "Enter the prize draw" }));
    const dialog = await screen.findByRole("dialog", { name: "Enter the prize draw" });

    const name = within(dialog).getByLabelText("Full name");
    const email = within(dialog).getByLabelText("Email");
    expect(name).not.toHaveFocus();
    expect(name).toHaveAttribute("autocapitalize", "words");
    expect(email).toHaveAttribute("autocapitalize", "none");
    expect(email).toHaveAttribute("enterkeyhint", "go");

    // The keyboard's Next key on the name field moves on to the email field.
    fireEvent.keyDown(name, { key: "Enter" });
    expect(email).toHaveFocus();
  });

  it("closes the sheet again", async () => {
    renderApp("/passport?now=13:00");
    fireEvent.click(screen.getByRole("button", { name: "Enter the prize draw" }));
    const dialog = await screen.findByRole("dialog", { name: "Enter the prize draw" });

    fireEvent.click(within(dialog).getAllByRole("button").find((button) => button.classList.contains("mantine-Modal-close"))!);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Enter the prize draw" })).toBeInTheDocument();
  });
});
