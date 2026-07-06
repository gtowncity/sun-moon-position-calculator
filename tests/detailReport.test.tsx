import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DetailReport } from "../src/components/dashboard/DetailReport";
import { getTranslator } from "../src/i18n";
import type { EventResult } from "../src/types";

const missingEvents: EventResult[] = [
  {
    body: "sun",
    kind: "rise",
    status: "not_found",
    localDate: null,
    localTime: null,
    timeZone: "Europe/Berlin",
    utcTime: null,
    azimuthDeg: null,
    apparentAltitudeDeg: null,
    geometricAltitudeDeg: null,
    warning: "noRise"
  },
  {
    body: "sun",
    kind: "rise",
    status: "not_found",
    localDate: null,
    localTime: null,
    timeZone: "Europe/Berlin",
    utcTime: null,
    azimuthDeg: null,
    apparentAltitudeDeg: null,
    geometricAltitudeDeg: null,
    warning: "noRise"
  },
  {
    body: "moon",
    kind: "set",
    status: "not_found",
    localDate: null,
    localTime: null,
    timeZone: "Europe/Berlin",
    utcTime: null,
    azimuthDeg: null,
    apparentAltitudeDeg: null,
    geometricAltitudeDeg: null,
    warning: "noSet"
  }
];

describe("DetailReport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders missing events without duplicate React key warnings", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <DetailReport
        events={missingEvents}
        firstInstantRows={[]}
        solarSummaries={[]}
        onFocusUtc={vi.fn()}
        t={getTranslator("en")}
      />
    );

    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining("Encountered two children with the same key"));
  });
});
