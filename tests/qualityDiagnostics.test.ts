import { describe, expect, it } from "vitest";
import { createDashboardInsight } from "../src/app/insights";
import { calculateQualityDiagnostics } from "../src/domain/insights/qualityDiagnostics";
import { makeRow } from "./helpers";

function pair(utcTime: string, sunAltitude: number, moonAltitude: number, illumination = 20) {
  return [
    {
      ...makeRow("sun", utcTime),
      apparentAltitudeDeg: sunAltitude,
      geometricAltitudeDeg: sunAltitude,
      altitudeDeg: sunAltitude
    },
    {
      ...makeRow("moon", utcTime),
      apparentAltitudeDeg: moonAltitude,
      geometricAltitudeDeg: moonAltitude,
      altitudeDeg: moonAltitude,
      illuminationPercent: illumination
    }
  ];
}

describe("quality diagnostics", () => {
  it("creates labeled diagnostics without pretending to be a scientific score", () => {
    const insight = createDashboardInsight([
      ...pair("2026-07-05T21:00:00Z", -12, -4, 10),
      ...pair("2026-07-05T22:00:00Z", -19, -8, 10),
      ...pair("2026-07-05T23:00:00Z", -20, -10, 20)
    ], { imagingMode: "strict", nightStartDate: "2026-07-05" });

    const diagnostics = calculateQualityDiagnostics(insight);

    expect(diagnostics.map((item) => item.key)).toEqual(["darkness", "moonImpact", "usability", "window"]);
    expect(diagnostics.every((item) => item.score >= 0 && item.score <= 100)).toBe(true);
    expect(diagnostics.find((item) => item.key === "moonImpact")?.valueLabel).toBe("LOW");
  });
});
