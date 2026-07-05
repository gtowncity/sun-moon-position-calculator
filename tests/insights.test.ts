import { describe, expect, it } from "vitest";
import { createDashboardInsight } from "../src/app/insights";
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

describe("dashboard insights", () => {
  it("turns result rows into samples, scores and a best window", () => {
    const insight = createDashboardInsight([
      ...pair("2026-07-03T20:00:00Z", -8, -4),
      ...pair("2026-07-03T21:00:00Z", -19, -6),
      ...pair("2026-07-03T22:00:00Z", -22, 12, 10),
      ...pair("2026-07-03T23:00:00Z", -23, 30, 90)
    ]);

    expect(insight.samples).toHaveLength(4);
    expect(insight.bestWindow).not.toBeNull();
    expect(insight.darknessScore).toBeGreaterThan(60);
    expect(insight.dayInsights[0].sampleCount).toBe(4);
  });
});
