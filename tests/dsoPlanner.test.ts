import { describe, expect, it } from "vitest";
import { defaultDsoSetupProfile, qualityProfileById } from "../src/dso/catalog/objectProfiles";
import { planTargetEffectiveIntegration } from "../src/dso/planner/effectiveIntegration";
import { generateDsoPlan } from "../src/dso/planner/generateDsoPlan";
import { groupDsoWindows } from "../src/dso/planner/groupWindows";
import { dsoNightLabel, enumerateNightStartDates, shouldIncludeNight } from "../src/dso/planner/weekendFilter";
import type { DsoInterval, DsoPlannerSettings, DsoWindow } from "../src/dso/types";

const berlin = { latitude: 52.52, longitude: 13.405, elevationMeters: 34 };

function settings(partial: Partial<DsoPlannerSettings> = {}): DsoPlannerSettings {
  return {
    location: berlin,
    locationName: "Berlin",
    timeZone: "Europe/Berlin",
    startDate: "2026-09-11",
    endDate: "2026-09-13",
    weekendOnly: false,
    exceptions: { forceInclude: [], exclude: [] },
    intervalMinutes: 60,
    objectId: "M31",
    setupProfile: defaultDsoSetupProfile,
    qualityProfile: qualityProfileById("normal"),
    mode: "range",
    bortle: 4.6,
    sqm: 21,
    ...partial
  };
}

function fakeInterval(index: number, category: DsoInterval["category"], score: number): DsoInterval {
  return {
    localDateTime: `2026-09-11 ${String(20 + index).padStart(2, "0")}:00`,
    utcDateTime: `2026-09-11T${String(18 + index).padStart(2, "0")}:00:00Z`,
    nightLabel: dsoNightLabel("2026-09-11"),
    intervalIndex: index,
    sunAltitudeDeg: -18,
    sunAzimuthDeg: 0,
    twilightClass: "astronomical_night",
    sunScore: 100,
    moonAltitudeDeg: -5,
    moonAzimuthDeg: 0,
    moonIlluminationPercent: 20,
    moonAboveHorizon: false,
    angularSeparationMoonTargetDeg: 120,
    moonScore: 100,
    moonPenaltyReason: "Moon below horizon.",
    moonState: "below_horizon",
    targetAltitudeDeg: 55,
    targetAzimuthDeg: 120,
    targetAirmassApprox: 1.2,
    targetVisible: true,
    targetAboveUsableAltitude: true,
    targetAboveMainAltitude: true,
    targetAltitudeScore: 95,
    targetCulminationTime: "23:00",
    targetMaxAltitudeThisNight: 60,
    targetHourAngle: 0,
    finalDsoScore: score,
    category,
    effectiveWeight: category === "MAIN" ? 1 : category === "EXTRA" ? 0.7 : category === "TEST" ? 0.25 : 0,
    reasons: [`${category} reason`],
    warnings: []
  };
}

describe("DSO planner", () => {
  it("enumerates nights, applies weekend filter and exceptions", () => {
    expect(enumerateNightStartDates("2026-09-10", "2026-09-13")).toEqual([
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13"
    ]);

    expect(shouldIncludeNight("2026-09-10", true, { forceInclude: [], exclude: [] }).include).toBe(false);
    expect(shouldIncludeNight("2026-09-10", true, { forceInclude: ["2026-09-10"], exclude: [] }).status).toBe("forced");
    expect(shouldIncludeNight("2026-09-12", true, { forceInclude: [], exclude: ["2026-09-12"] }).include).toBe(false);
  });

  it("groups contiguous intervals into category windows", () => {
    const windows = groupDsoWindows(
      [
        fakeInterval(0, "BAD", 20),
        fakeInterval(1, "MAIN", 88),
        fakeInterval(2, "MAIN", 90),
        fakeInterval(3, "EXTRA", 72)
      ],
      30,
      "M31",
      "Andromeda Galaxy",
      "Europe/Berlin"
    );

    expect(windows.map((window) => window.category)).toEqual(["BAD", "MAIN", "EXTRA"]);
    expect(windows[1].durationMinutes).toBe(60);
    expect(windows[1].effectiveDurationMinutes).toBe(60);
  });

  it("generates per-night M31 plans with target altitude, moon distance and windows", () => {
    const plan = generateDsoPlan(settings());

    expect(plan.nights.length).toBe(3);
    expect(plan.nights[0].targetMaxAltitudeDeg).toBeGreaterThan(40);
    expect(plan.nights[0].timeAbove30).toBeGreaterThan(0);
    expect(plan.nights[0].intervals[0].angularSeparationMoonTargetDeg).toBeGreaterThanOrEqual(0);
    expect(plan.nights.flatMap((night) => night.windows).length).toBeGreaterThan(0);
  });

  it("selects windows until target effective integration is reached", () => {
    const windows: DsoWindow[] = [
      { ...groupDsoWindows([fakeInterval(0, "MAIN", 92), fakeInterval(1, "MAIN", 91)], 60, "M31", "Andromeda", "Europe/Berlin")[0], effectiveDurationMinutes: 120 },
      { ...groupDsoWindows([fakeInterval(2, "EXTRA", 72)], 60, "M31", "Andromeda", "Europe/Berlin")[0], effectiveDurationMinutes: 42 }
    ];
    const target = planTargetEffectiveIntegration(windows, 2);

    expect(target.reached).toBe(true);
    expect(target.selectedWindows).toHaveLength(1);
    expect(target.mainEffectiveMinutes).toBe(120);
  });

  it("runs target-hours mode and marks selected windows", () => {
    const plan = generateDsoPlan(settings({
      startDate: "2026-09-01",
      endDate: "2026-09-20",
      intervalMinutes: 60,
      mode: "targetHours",
      targetEffectiveHours: 2
    }));

    expect(plan.targetHoursPlan?.targetEffectiveMinutes).toBe(120);
    expect(plan.targetHoursPlan?.selectedWindows.length).toBeGreaterThan(0);
    expect(plan.targetHoursPlan?.remainingEffectiveMinutes).toBeGreaterThanOrEqual(0);
  });
});
