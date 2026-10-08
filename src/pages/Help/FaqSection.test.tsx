import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import faqData from "../../data/faq.json";
import { renderApp } from "../../test/renderApp";

describe("FAQ", () => {
  it("has unique ids and a question and answer for every entry", () => {
    expect(new Set(faqData.map((faq) => faq.id)).size).toBe(faqData.length);
    expect(faqData.filter((faq) => !faq.question.trim() || !faq.answer.trim())).toEqual([]);
  });

  it("lists the questions on the Help page, grouped by topic", () => {
    renderApp("/help");

    const faq = screen.getByRole("region", { name: "FAQ" });
    expect(within(faq).getByRole("heading", { name: "Passport & stickers" })).toBeInTheDocument();
    expect(within(faq).getByRole("button", { name: /How does the passport work\?/ })).toBeInTheDocument();
  });

  it("lists parking lots, shows the prize answer and hides unanswered questions", () => {
    renderApp("/help");

    fireEvent.click(screen.getByRole("button", { name: /Where can I park\?/ }));
    expect(screen.getByText("Windsor Car Park")).toBeInTheDocument();
    expect(screen.queryByText("To be confirmed")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Is there a prize/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Is the building accessible/ })).not.toBeInTheDocument();
  });

  it("filters questions as you type", () => {
    renderApp("/help");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search questions" }), { target: { value: "Lister" } });

    expect(screen.getByRole("button", { name: /Is there food or water/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Where can I park\?/ })).not.toBeInTheDocument();
  });

  it("says when nothing matches", () => {
    renderApp("/help");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search questions" }), { target: { value: "zeppelin" } });

    expect(screen.getByText(/No questions match/)).toBeInTheDocument();
  });

  it("sends the old /faq link to the FAQ on the Help page", () => {
    renderApp("/faq");

    expect(screen.getByRole("heading", { name: "Help & Support" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "FAQ" })).toBeInTheDocument();
  });
});
