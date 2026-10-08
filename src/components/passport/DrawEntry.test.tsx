import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getActiveBooths } from "../../lib/content";
import { entryCode, suggestEmail } from "../../lib/draw";
import { savePassport } from "../../lib/passport";
import { renderApp } from "../../test/renderApp";

const ENDPOINT = "https://script.google.com/macros/s/test-deployment/exec";
const { drawEndpoint } = vi.hoisted(() => ({ drawEndpoint: { value: "" } }));

vi.mock("../../lib/schedule", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/schedule")>();
  return { ...actual, getEventInfo: () => ({ ...actual.getEventInfo(), drawEndpoint: drawEndpoint.value || undefined }) };
});

const PASSPORT_ID = "3f9a2c1e-7b44-4d2a-9c1d-5e6f7a8b9c0d";
const stampIds = getActiveBooths().map((booth) => booth.stamp.id);

function completePassport() {
  savePassport({
    passportId: PASSPORT_ID,
    collectedStamps: stampIds,
    collectedAt: Object.fromEntries(stampIds.map((id, index) => [id, new Date(Date.UTC(2026, 9, 17, 16, index * 8)).toISOString()])),
  });
}

function respond(body: object) {
  return Promise.resolve(new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } }));
}

async function enter(name: string, email: string) {
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Full name"), { target: { value: name } });
  fireEvent.change(within(dialog).getByLabelText("Email"), { target: { value: email } });
  const agree = within(dialog).getByLabelText("I agree to the prize draw terms");
  if (!(agree as HTMLInputElement).checked) fireEvent.click(agree);
  fireEvent.click(within(dialog).getByRole("button", { name: /Enter the draw|Update my entry/ }));
}

describe("prize draw entry", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    drawEndpoint.value = ENDPOINT;
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    completePassport();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stays hidden until the draw is connected", () => {
    drawEndpoint.value = "";
    renderApp("/passport?now=13:00");

    expect(screen.getByRole("heading", { name: "You're a Certified Explorer!" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enter the prize draw" })).not.toBeInTheDocument();
  });

  it("enters a completed passport in the draw", async () => {
    fetchMock.mockReturnValue(respond({ ok: true, status: "created" }));
    renderApp("/passport?now=13:00");

    expect(screen.getByText(/chance to win a gift card/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enter the prize draw" }));
    await enter("Alex Rivera", "alex@example.com");

    expect(await screen.findByText("You're entered in the draw!")).toBeInTheDocument();
    expect(screen.getByText(entryCode(PASSPORT_ID))).toBeInTheDocument();
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe(ENDPOINT);
    expect(JSON.parse(request.body)).toMatchObject({
      name: "Alex Rivera",
      email: "alex@example.com",
      consent: true,
      passportId: PASSPORT_ID,
      stickers: stampIds.length,
      firstStickerAt: "2026-10-17T16:00:00.000Z",
      website: "",
    });
  });

  it("asks for the details and the terms before sending anything", async () => {
    renderApp("/passport?now=13:00");
    fireEvent.click(screen.getByRole("button", { name: "Enter the prize draw" }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Enter the draw" }));

    expect(within(dialog).getByText("Please enter your full name.")).toBeInTheDocument();
    expect(within(dialog).getByText("Please enter a valid email address.")).toBeInTheDocument();
    expect(within(dialog).getByText("Please agree to the terms to enter.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("suggests a fix for a likely email typo", async () => {
    renderApp("/passport?now=13:00");
    fireEvent.click(screen.getByRole("button", { name: "Enter the prize draw" }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText("Email"), { target: { value: "alex@gmial.com" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "alex@gmail.com" }));

    expect(within(dialog).getByLabelText("Email")).toHaveValue("alex@gmail.com");
  });

  it("lets the visitor fix their email, updating the same entry", async () => {
    fetchMock.mockReturnValueOnce(respond({ ok: true, status: "created" })).mockReturnValueOnce(respond({ ok: true, status: "updated" }));
    renderApp("/passport?now=13:00");
    fireEvent.click(screen.getByRole("button", { name: "Enter the prize draw" }));
    await enter("Alex Rivera", "alex@exampel.com");
    await screen.findByText("You're entered in the draw!");

    fireEvent.click(screen.getByRole("button", { name: "Edit entry" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit your entry" });
    expect(within(dialog).getByLabelText("Email")).toHaveValue("alex@exampel.com");
    await enter("Alex Rivera", "alex@example.com");

    expect(await screen.findByText(/alex@example\.com/)).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toMatchObject({ passportId: PASSPORT_ID, email: "alex@example.com" });
  });

  it("shows why an entry was refused", async () => {
    fetchMock.mockReturnValue(respond({ ok: false, error: "This email is already entered in the draw." }));
    renderApp("/passport?now=13:00");
    fireEvent.click(screen.getByRole("button", { name: "Enter the prize draw" }));
    await enter("Alex Rivera", "alex@example.com");

    expect(await screen.findByText("This email is already entered in the draw.")).toBeInTheDocument();
    expect(screen.queryByText("You're entered in the draw!")).not.toBeInTheDocument();
  });

  it("keeps an entry made with no signal and sends it when the connection returns", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderApp("/passport?now=13:00");
    fireEvent.click(screen.getByRole("button", { name: "Enter the prize draw" }));
    await enter("Alex Rivera", "alex@example.com");

    expect(await screen.findByText("Entry saved, sending when you're back online")).toBeInTheDocument();

    fetchMock.mockReturnValue(respond({ ok: true, status: "created" }));
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    expect(await screen.findByText("You're entered in the draw!")).toBeInTheDocument();
  });

  it("closes at the set time", () => {
    renderApp("/passport?now=15:30");

    expect(screen.getByText("The prize draw closed at 3:00 PM.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enter the prize draw" })).not.toBeInTheDocument();
  });
});

describe("email typo hints", () => {
  it("suggests common domains only when the domain is a near miss", () => {
    expect(suggestEmail("sam@hotmial.com")).toBe("sam@hotmail.com");
    expect(suggestEmail("sam@gmail.con")).toBe("sam@gmail.com");
    expect(suggestEmail("sam@ualbera.ca")).toBe("sam@ualberta.ca");
    expect(suggestEmail("sam@gmail.com")).toBeUndefined();
    expect(suggestEmail("sam@mycompany.org")).toBeUndefined();
  });
});
