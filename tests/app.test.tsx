import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../src/app/App";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the Sun/Moon app frame and calculation controls", () => {
    const view = render(<App />);

    expect(view.getByText(/Sun & Moon Position Calculator/i)).toBeInTheDocument();
    expect(view.getByRole("button", { name: /Berechnung starten/i })).toBeInTheDocument();
    expect(view.getByRole("button", { name: /DSO Planner/i })).toBeInTheDocument();
  });

  it("switches to the DSO session planner", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /DSO Planner/i }));

    expect(screen.getByText(/\[DSO Session Planner\]/i)).toBeInTheDocument();
    expect(screen.getByText(/Session-Ziele/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Session neu berechnen/i })).toBeInTheDocument();
  });

  it("keeps moon-only grid rows while night analysis still has solar context", async () => {
    const view = render(<App />);

    fireEvent.click(screen.getByRole("radio", { name: /Nur Mond/i }));
    fireEvent.click(screen.getByRole("button", { name: /Berechnung starten/i }));

    await waitFor(() => expect(screen.queryByText(/^Noch keine Ergebnisse\.$/)).not.toBeInTheDocument());

    const tables = view.container.querySelectorAll(".win98-table");
    const dataGrid = tables[tables.length - 1] as HTMLElement;
    const rows = within(dataGrid).getAllByRole("row").slice(1);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(within(row).getAllByRole("cell")[1]).toHaveTextContent(/Mond/);
    }
  });
});
