import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResultDataGrid } from "../src/components/dashboard/ResultDataGrid";
import { getTranslator } from "../src/i18n";
import { makeRow } from "./helpers";

const t = getTranslator("en");

function renderGrid() {
  const rows = [
    { ...makeRow("moon", "2026-07-03T12:15:00Z", 4), azimuthDeg: 300, apparentAltitudeDeg: 5, geometricAltitudeDeg: 4, illuminationPercent: 80 },
    { ...makeRow("sun", "2026-07-03T12:00:00Z", 1), azimuthDeg: 120, apparentAltitudeDeg: 20, geometricAltitudeDeg: 19, illuminationPercent: null },
    { ...makeRow("moon", "2026-07-03T12:00:00Z", 2), azimuthDeg: 220, apparentAltitudeDeg: -2, geometricAltitudeDeg: -3, illuminationPercent: 10 },
    { ...makeRow("sun", "2026-07-03T12:15:00Z", 3), azimuthDeg: 110, apparentAltitudeDeg: 25, geometricAltitudeDeg: 24, illuminationPercent: null }
  ];

  return render(
    <ResultDataGrid
      rows={rows}
      focusedUtc={null}
      onXlsx={vi.fn()}
      onTxt={vi.fn()}
      onMarkdown={vi.fn()}
      t={t}
    />
  );
}

function bodyOrder(): string[] {
  return screen.getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell")[1].textContent ?? "");
}

function firstNumericCell(columnIndex: number): number {
  const firstRow = screen.getAllByRole("row")[1];
  return Number(within(firstRow).getAllByRole("cell")[columnIndex].textContent);
}

describe("ResultDataGrid sorting", () => {
  it("keeps default body and UTC sorting", () => {
    renderGrid();

    expect(bodyOrder()).toEqual(["Sun", "Sun", "Moon", "Moon"]);
  });

  it("sorts UTC ascending and descending", () => {
    renderGrid();
    fireEvent.change(screen.getByLabelText(/sort by/i), { target: { value: "utcTime" } });

    expect(within(screen.getAllByRole("row")[1]).getAllByRole("cell")[5]).toHaveTextContent("2026-07-03T12:00:00Z");

    fireEvent.click(screen.getByRole("button", { name: /sort direction/i }));
    expect(within(screen.getAllByRole("row")[1]).getAllByRole("cell")[5]).toHaveTextContent("2026-07-03T12:15:00Z");
  });

  it("sorts by body, azimuth, altitude and illumination with filters active", () => {
    renderGrid();

    fireEvent.change(screen.getByLabelText(/sort by/i), { target: { value: "azimuthDeg" } });
    expect(firstNumericCell(6)).toBe(110);

    fireEvent.change(screen.getByLabelText(/sort by/i), { target: { value: "apparentAltitudeDeg" } });
    expect(firstNumericCell(7)).toBe(-2);

    fireEvent.change(screen.getByLabelText(/sort by/i), { target: { value: "geometricAltitudeDeg" } });
    expect(firstNumericCell(8)).toBe(-3);

    fireEvent.change(screen.getByLabelText(/sort by/i), { target: { value: "illuminationPercent" } });
    expect(firstNumericCell(15)).toBe(10);

    fireEvent.click(screen.getByLabelText(/moon/i));
    expect(bodyOrder()).toEqual(["Moon", "Moon"]);
  });

  it("keeps a clean no-results state", () => {
    renderGrid();
    fireEvent.change(screen.getByLabelText(/filter rows/i), { target: { value: "no-such-row" } });

    expect(screen.getAllByRole("row")).toHaveLength(1);
  });
});
