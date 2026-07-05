import { describe, expect, it } from "vitest";
import { classifySolarAltitude, summarizeSolarPhases } from "../src/lib/solar/phases";
import { makeRow } from "./helpers";

function sunRow(altitudeDeg: number, localTime: string) {
  return {
    ...makeRow("sun", `2026-01-01T${localTime}Z`),
    localDate: "2026-01-01",
    localTime,
    utcTime: `2026-01-01T${localTime}Z`,
    altitudeDeg,
    geometricAltitudeDeg: altitudeDeg,
    apparentAltitudeDeg: altitudeDeg,
    zenithDeg: 90 - altitudeDeg,
    geometricZenithDeg: 90 - altitudeDeg,
    apparentZenithDeg: 90 - altitudeDeg
  };
}

describe("solar phases", () => {
  it("classifies geometric solar altitude thresholds", () => {
    expect(classifySolarAltitude(0.1)).toBe("day");
    expect(classifySolarAltitude(0)).toBe("civilTwilight");
    expect(classifySolarAltitude(-6)).toBe("civilTwilight");
    expect(classifySolarAltitude(-6.1)).toBe("nauticalTwilight");
    expect(classifySolarAltitude(-12.1)).toBe("astronomicalTwilight");
    expect(classifySolarAltitude(-18.1)).toBe("night");
  });

  it("summarizes phases per local date", () => {
    const summary = summarizeSolarPhases([
      sunRow(10, "10:00:00"),
      sunRow(-3, "18:00:00"),
      sunRow(-20, "23:00:00")
    ]);

    expect(summary[0].phases.day).toBe("10:00");
    expect(summary[0].phases.civilTwilight).toBe("18:00");
    expect(summary[0].phases.night).toBe("23:00");
    expect(summary[0].phases.nauticalTwilight).toBeNull();
  });
});
