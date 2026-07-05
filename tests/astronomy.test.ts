import { Temporal } from "@js-temporal/polyfill";
import { describe, expect, it } from "vitest";
import { calculatePositions, expandBodySelection } from "../src/lib/astronomy/calculator";

const instant = Temporal.Instant.from("2026-07-03T12:00:00Z");

describe("body selection", () => {
  it("expands single and combined selections", () => {
    expect(expandBodySelection("sun")).toEqual(["sun"]);
    expect(expandBodySelection("moon")).toEqual(["moon"]);
    expect(expandBodySelection("both")).toEqual(["sun", "moon"]);
  });
});

describe("result row data model", () => {
  it("creates one row per instant and body with separated geometric/apparent values", () => {
    const rows = calculatePositions({
      instants: [instant],
      observer: { latitude: 52.52, longitude: 13.405, elevationMeters: 34 },
      bodySelection: "both",
      timeZone: "Europe/Berlin",
      options: { refraction: { mode: "standard", pressureHpa: 1013.25, temperatureC: 15 } }
    });

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.body)).toEqual(["sun", "moon"]);

    for (const row of rows) {
      expect(row.localDate).toBe("2026-07-03");
      expect(row.timeZone).toBe("Europe/Berlin");
      expect(row.utcTime).toBe("2026-07-03T12:00:00Z");
      expect(Number.isFinite(row.azimuthDeg)).toBe(true);
      expect(Number.isFinite(row.geometricAltitudeDeg)).toBe(true);
      expect(Number.isFinite(row.apparentAltitudeDeg)).toBe(true);
      expect(row.geometricZenithDeg).toBeCloseTo(90 - row.geometricAltitudeDeg, 10);
      expect(row.apparentZenithDeg).toBeCloseTo(90 - row.apparentAltitudeDeg, 10);
      expect(row.algorithm).toContain("astronomy-engine");
    }

    expect(rows.find((row) => row.body === "moon")?.phaseName).not.toBeNull();
    expect(rows.find((row) => row.body === "sun")?.phaseName).toBeNull();
  });

  it("can disable refraction so apparent equals geometric", () => {
    const [row] = calculatePositions({
      instants: [instant],
      observer: { latitude: 52.52, longitude: 13.405, elevationMeters: 34 },
      bodySelection: "sun",
      timeZone: "Europe/Berlin",
      options: { refraction: { mode: "none", pressureHpa: 1013.25, temperatureC: 15 } }
    });

    expect(row.apparentAltitudeDeg).toBeCloseTo(row.geometricAltitudeDeg, 12);
  });
});
