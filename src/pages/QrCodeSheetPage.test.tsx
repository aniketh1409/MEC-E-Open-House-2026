import { fireEvent, screen } from "@testing-library/react";
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../test/renderApp";

// A throwaway password for tests. Its fingerprint is written out because vi.mock runs before imports.
const TEST_PASSWORD = "test-password-123";
const TEST_HASH = "14e30dfeff19e57a60bce88585de5d56d732aafb26478b120cb1bffae68998fc";

vi.mock("../lib/schedule", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/schedule")>();
  return { ...actual, getEventInfo: () => ({ ...actual.getEventInfo(), qrPagePasswordHash: "14e30dfeff19e57a60bce88585de5d56d732aafb26478b120cb1bffae68998fc" }) };
});

describe("QR codes page", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("uses a fingerprint made the same way as the real password", () => {
    expect(createHash("sha256").update(`mece-open-house-qr-page:${TEST_PASSWORD}`).digest("hex")).toBe(TEST_HASH);
  });

  it("asks for a password before showing any code", () => {
    renderApp("/qr-codes");

    expect(screen.getByRole("heading", { name: "Stall QR codes" })).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Print QR sheet" })).not.toBeInTheDocument();
  });

  it("refuses a wrong password", async () => {
    renderApp("/qr-codes");

    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "guess" } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));

    expect(await screen.findByText("That password isn't right.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Print QR sheet" })).not.toBeInTheDocument();
  });

  it("shows the QR sheet with the right password", async () => {
    renderApp("/qr-codes");

    fireEvent.change(screen.getByLabelText("Password"), { target: { value: TEST_PASSWORD } });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));

    expect(await screen.findByRole("button", { name: "Print QR sheet" })).toBeInTheDocument();
  });
});
