import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DsoPlannerPage } from "../src/dso/components/DsoPlannerPage";

describe("DsoPlannerPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("calculates a German DSO session from the UI", async () => {
    render(
      <DsoPlannerPage
        language="de"
        latitude="52.520000"
        longitude="13.405000"
        elevationMeters="34"
        locationName="Berlin"
        timeZone="Europe/Berlin"
        startDate="2026-09-11"
      />
    );

    expect(screen.getByText(/Session-Ziele/i)).toBeInTheDocument();
    expect(screen.getByText(/Was beeinflusst das Qualitaetsprofil/i)).toBeInTheDocument();
    expect(screen.queryByText(/Rohdaten ausblenden/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Session neu berechnen/i }));

    await waitFor(() => expect(screen.getByRole("heading", { name: /Belichtungsziel/i })).toBeInTheDocument(), { timeout: 8000 });
    expect(screen.getAllByText(/Kalender/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Framing \/ Bildfeld/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/M31/i).length).toBeGreaterThan(0);
  }, 20000);

  it("can add and remove a second session target", () => {
    render(
      <DsoPlannerPage
        language="de"
        latitude="52.520000"
        longitude="13.405000"
        elevationMeters="34"
        locationName="Berlin"
        timeZone="Europe/Berlin"
        startDate="2026-09-11"
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/M31, M51/i), { target: { value: "M51" } });
    fireEvent.click(screen.getByText(/M51/i));
    fireEvent.click(screen.getByRole("button", { name: /Zur Session hinzufuegen/i }));

    expect(screen.getAllByText(/M51/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: /entfernen/i })[1]);
    expect(screen.getAllByText(/M31/i).length).toBeGreaterThan(0);
  });
});
