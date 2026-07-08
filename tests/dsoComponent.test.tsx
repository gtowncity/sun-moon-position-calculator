import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DsoPlannerPage } from "../src/dso/components/DsoPlannerPage";

describe("DsoPlannerPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("calculates an M31 plan from the UI", async () => {
    render(
      <DsoPlannerPage
        language="en"
        latitude="52.520000"
        longitude="13.405000"
        elevationMeters="34"
        locationName="Berlin"
        timeZone="Europe/Berlin"
        startDate="2026-09-11"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /calculate dso plan/i }));

    await waitFor(() => expect(screen.getByText(/\[Night summary\]/i)).toBeInTheDocument(), { timeout: 8000 });
    expect(screen.getByText(/\[Recommended windows\]/i)).toBeInTheDocument();
    expect(screen.getByText(/M31 Andromeda Galaxy/i)).toBeInTheDocument();
  });
});
