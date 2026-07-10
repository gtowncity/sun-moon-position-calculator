import { beforeEach, describe, expect, it } from "vitest";
import { defaultDsoSetupProfile, qualityProfileById } from "../src/dso/catalog/objectProfiles";
import { generateDsoSessionPlan } from "../src/dso/session/generateDsoSessionPlan";
import { emptyCalendarOverrides, type SessionTarget } from "../src/dso/session/sessionTypes";
import {
  deleteDsoLocationProfile,
  loadDefaultDsoLocationProfile,
  loadDsoLocationProfiles,
  saveDsoLocationProfile,
  setDefaultDsoLocationProfile
} from "../src/dso/storage/dsoLocationStorage";
import type { DsoPlannerSettings } from "../src/dso/types";

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
    mode: "targetHours",
    targetEffectiveHours: 6,
    bortle: 4.6,
    sqm: 21,
    ...partial
  };
}

function targets(): SessionTarget[] {
  return [
    { id: "target-m31", objectId: "M31", targetEffectiveHours: 2, priority: 1, enabled: true, isPrimary: true },
    { id: "target-m51", objectId: "M51", targetEffectiveHours: 2, priority: 2, enabled: true }
  ];
}

describe("DSO session planner", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates a multi-object session plan with separated calendar statuses", () => {
    const plan = generateDsoSessionPlan({
      baseSettings: settings(),
      targets: targets(),
      allocationMode: "manual",
      totalTargetEffectiveHours: 4,
      calendarOverrides: emptyCalendarOverrides()
    });

    expect(plan.objectPlans).toHaveLength(2);
    expect(plan.combinedWindows.length).toBeGreaterThan(0);
    expect(plan.calendarDays[0]).toHaveProperty("qualityStatus");
    expect(plan.calendarDays[0]).toHaveProperty("dataCategoryStatus");
    expect(plan.calendarDays[0]).toHaveProperty("selectionStatus");
    expect(plan.calendarDays[0]).toHaveProperty("totalStatus");
  });

  it("excludes a calendar date from session totals without deleting the quality status", () => {
    const baseline = generateDsoSessionPlan({
      baseSettings: settings(),
      targets: targets(),
      allocationMode: "manual",
      totalTargetEffectiveHours: 4,
      calendarOverrides: emptyCalendarOverrides()
    });
    const date = baseline.calendarDays.find((day) => day.countsInTotal)?.date ?? baseline.calendarDays[0].date;
    const excluded = generateDsoSessionPlan({
      baseSettings: settings(),
      targets: targets(),
      allocationMode: "manual",
      totalTargetEffectiveHours: 4,
      calendarOverrides: {
        includeInTotalsDates: [],
        excludeFromTotalsDates: [date],
        preferredDates: [],
        previewOnlyDates: []
      }
    });

    const day = excluded.calendarDays.find((entry) => entry.date === date);
    expect(day?.selectionStatus).toBe("excluded");
    expect(day?.qualityStatus).not.toBeUndefined();
  });

  it("stores, loads, defaults and deletes complete DSO locations", () => {
    const saved = saveDsoLocationProfile({
      name: "Geiselhoering",
      latitude: 48.825,
      longitude: 12.397,
      elevationMeters: 360,
      timeZone: "Europe/Berlin",
      bortle: 4,
      sqm: 21.2,
      isDefault: false
    });

    expect(loadDsoLocationProfiles()).toHaveLength(1);
    setDefaultDsoLocationProfile(saved.id);
    expect(loadDefaultDsoLocationProfile()?.name).toBe("Geiselhoering");
    deleteDsoLocationProfile(saved.id);
    expect(loadDsoLocationProfiles()).toHaveLength(0);
  });
});
