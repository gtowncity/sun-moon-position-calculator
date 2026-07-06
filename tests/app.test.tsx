import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../src/app/App";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders the terminal app frame and calculation controls", () => {
    const view = render(<App />);

    expect(view.getByText(/SUN\/MOON ASTRO TERMINAL/i)).toBeInTheDocument();
    expect(view.getByRole("button", { name: /analyze night/i })).toBeInTheDocument();
    expect(view.getByText(/\[Control panel\]|\[Kontrollpanel\]/i)).toBeInTheDocument();
  });

  it("shows a time input and instant-specific action in single-instant mode", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: /single instant|einzelzeitpunkt/i }));

    expect(screen.getByLabelText(/time|uhrzeit/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /calculate instant|zeitpunkt berechnen/i })).toBeInTheDocument();
    expect(screen.getByText(/instant result|zeitpunkt-ergebnis/i)).toBeInTheDocument();
  });

  it("keeps moon-only grid rows while night analysis still has solar context", async () => {
    const view = render(<App />);
    const targetSelect = view.container.querySelector(".control-target select") as HTMLSelectElement;

    fireEvent.change(targetSelect, { target: { value: "moon" } });
    fireEvent.click(screen.getByRole("button", { name: /analyze night/i }));

    await waitFor(() => expect(screen.getByText(/night analysis also uses internal sun altitude|nachtanalyse nutzt intern/i)).toBeInTheDocument());
    expect(screen.queryByText(/^No results yet\.|^Noch keine Ergebnisse\.$/)).not.toBeInTheDocument();

    const dataGrid = view.container.querySelector(".result-data-grid-panel") as HTMLElement;
    const rows = within(dataGrid).getAllByRole("row").slice(1);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(within(row).getAllByRole("cell")[1]).toHaveTextContent(/Moon|Mond/);
    }
  });
});
