import { describe, expect, it } from "vitest";
import {
  calculateEffectiveImagingWindow,
  calculateMultiNightSummaries,
  calculateNightSummary,
  calculateSolarTwilightPhases,
  classifySolarAltitudeForImaging,
  imagingModeThreshold,
  type SolarNightSample
} from "../src/domain/insights/effectiveImagingWindow";
import { calculateMultiNightPlan } from "../src/domain/insights/multiNightPlanner";

function sample(localDate: string, localTime: string, altitude: number): SolarNightSample {
  return {
    localDate,
    localTime: `${localTime}:00`,
    utcTime: `${localDate}T${localTime}:00Z`,
    sunAltitudeDeg: altitude,
    moonAltitudeDeg: -5,
    moonIlluminationPercent: 40,
    moonInterference: 0
  };
}

function nightWithAstronomicalDarkness(): SolarNightSample[] {
  return [
    sample("2026-07-05", "18:00", 5),
    sample("2026-07-05", "19:00", -2),
    sample("2026-07-05", "20:00", -8),
    sample("2026-07-05", "21:00", -13),
    sample("2026-07-05", "22:00", -16),
    sample("2026-07-05", "23:00", -19),
    sample("2026-07-06", "00:00", -20),
    sample("2026-07-06", "01:00", -19),
    sample("2026-07-06", "02:00", -16),
    sample("2026-07-06", "03:00", -13),
    sample("2026-07-06", "04:00", -8),
    sample("2026-07-06", "05:00", -2),
    sample("2026-07-06", "06:00", 5)
  ];
}

function nightWithoutAstronomicalDarkness(): SolarNightSample[] {
  return [
    sample("2026-06-20", "18:00", 4),
    sample("2026-06-20", "20:00", -4),
    sample("2026-06-20", "22:00", -9),
    sample("2026-06-21", "00:00", -13),
    sample("2026-06-21", "02:00", -10),
    sample("2026-06-21", "04:00", -4),
    sample("2026-06-21", "06:00", 4)
  ];
}

describe("effective imaging window", () => {
  it("classifies solar altitude by imaging usefulness", () => {
    expect(classifySolarAltitudeForImaging(-3).usefulness).toBe("not_useful");
    expect(classifySolarAltitudeForImaging(-8).usefulness).toBe("limited");
    expect(classifySolarAltitudeForImaging(-13).usefulness).toBe("usable_for_bright_targets");
    expect(classifySolarAltitudeForImaging(-16).usefulness).toBe("good");
    expect(classifySolarAltitudeForImaging(-19).usefulness).toBe("excellent");
  });

  it("calculates twilight phases for a night with real astronomical darkness", () => {
    const summary = calculateNightSummary(nightWithAstronomicalDarkness(), "UTC", "strict", "2026-07-05");
    expect(summary?.nightLabel).toBe("05.07.2026 -> 06.07.2026");
    expect(summary?.milestones.sunset).toBeTruthy();
    expect(summary?.milestones.astronomicalNightStart).toBeTruthy();
    expect(summary?.astronomicalNightMinutes).toBeGreaterThan(100);
    expect(summary?.effectiveWindow?.thresholdDeg).toBe(-18);
  });

  it("reports missing astronomical night honestly", () => {
    const summary = calculateNightSummary(nightWithoutAstronomicalDarkness(), "UTC", "strict", "2026-06-20");
    expect(summary?.astronomicalNightMinutes).toBe(0);
    expect(summary?.warning).toBe("no_astronomical_night");
    expect(summary?.effectiveWindow).toBeNull();
  });

  it("supports strict, balanced and bright-target thresholds", () => {
    const samples = nightWithAstronomicalDarkness();
    expect(imagingModeThreshold("strict")).toBe(-18);
    expect(imagingModeThreshold("balanced")).toBe(-15);
    expect(imagingModeThreshold("bright")).toBe(-12);
    expect(calculateEffectiveImagingWindow(samples, "UTC", "balanced")?.thresholdDeg).toBe(-15);
    expect(calculateEffectiveImagingWindow(samples, "UTC", "bright")?.thresholdDeg).toBe(-12);
  });

  it("creates multiple night summaries grouped by evening date", () => {
    const secondNight = nightWithAstronomicalDarkness().map((entry) => ({
      ...entry,
      localDate: entry.localDate === "2026-07-05" ? "2026-07-06" : "2026-07-07",
      utcTime: entry.utcTime.replace("2026-07-05", "2026-07-06").replace("2026-07-06", "2026-07-07")
    }));
    const summaries = calculateMultiNightSummaries([...nightWithAstronomicalDarkness(), ...secondNight], "UTC", "strict");
    const planned = calculateMultiNightPlan([...nightWithAstronomicalDarkness(), ...secondNight], "UTC", "strict");
    expect(summaries).toHaveLength(2);
    expect(planned).toHaveLength(2);
    expect(summaries[0].nightStartDate).toBe("2026-07-05");
    expect(summaries[1].nightStartDate).toBe("2026-07-06");
  });

  it("returns twilight phase segments", () => {
    const segments = calculateSolarTwilightPhases(nightWithAstronomicalDarkness(), "UTC");
    expect(segments.some((segment) => segment.darknessClass === "astronomical_night")).toBe(true);
    expect(segments.every((segment) => segment.durationMinutes > 0)).toBe(true);
  });
});
