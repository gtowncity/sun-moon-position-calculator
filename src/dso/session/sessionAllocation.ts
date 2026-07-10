import { Temporal } from "@js-temporal/polyfill";
import type { DeepSkyObject, DsoWindow } from "../types";
import type { CombinedWindow, CalendarOverrides, CalendarQualityStatus, SessionTarget } from "./sessionTypes";
import { categoryToDataStatus } from "./sessionTypes";

function windowDate(window: DsoWindow): string {
  return window.nightLabel.slice(0, 10);
}

function windowPriority(window: DsoWindow, target: SessionTarget, overrides: CalendarOverrides): number {
  const categoryBonus = window.category === "MAIN" ? 10000 : window.category === "EXTRA" ? 6000 : window.category === "TEST" ? 1500 : 0;
  const date = windowDate(window);
  const preferredBonus = overrides.preferredDates.includes(date) ? 3500 : 0;
  return categoryBonus +
    preferredBonus +
    (100 - target.priority) * 120 +
    window.averageScore * 45 +
    window.averageTargetAltitude * 14 -
    Math.max(0, window.averageMoonAltitude) * 4 -
    window.averageMoonIllumination * 3 +
    window.durationMinutes * 0.3;
}

function overlaps(a: DsoWindow, b: DsoWindow): boolean {
  const aStart = Temporal.Instant.from(a.startUtc);
  const aEnd = Temporal.Instant.from(a.endUtc);
  const bStart = Temporal.Instant.from(b.startUtc);
  const bEnd = Temporal.Instant.from(b.endUtc);
  return Temporal.Instant.compare(aStart, bEnd) < 0 && Temporal.Instant.compare(bStart, aEnd) < 0;
}

function qualityFromScore(score: number): CalendarQualityStatus {
  if (score >= 86) return "excellent";
  if (score >= 76) return "good";
  if (score >= 58) return "usable";
  if (score > 0) return "poor";
  return "bad";
}

function toCombinedWindow(
  window: DsoWindow,
  target: SessionTarget,
  object: DeepSkyObject,
  includeInTotals: boolean,
  selectedForTarget: boolean
): CombinedWindow {
  const date = windowDate(window);
  return {
    ...window,
    targetId: target.id,
    object,
    dateStart: date,
    dataCategoryStatus: categoryToDataStatus(window.category),
    qualityStatus: qualityFromScore(window.averageScore),
    selectionStatus: selectedForTarget ? "selectedForTarget" : "neutral",
    totalStatus: includeInTotals ? "countsInTotal" : "ignoredInTotal",
    includeInTotals,
    selectedForTarget
  };
}

export interface AllocationInput {
  target: SessionTarget;
  object: DeepSkyObject;
  windows: DsoWindow[];
  targetEffectiveMinutes: number;
}

export interface AllocatedTargetWindows {
  target: SessionTarget;
  object: DeepSkyObject;
  targetEffectiveMinutes: number;
  selectedWindows: CombinedWindow[];
  effectiveDurationMinutes: number;
  realDurationMinutes: number;
}

export function allocateSessionWindows(inputs: AllocationInput[], overrides: CalendarOverrides): AllocatedTargetWindows[] {
  const occupied: DsoWindow[] = [];
  const sortedInputs = [...inputs].sort((a, b) => a.target.priority - b.target.priority || a.object.id.localeCompare(b.object.id));

  return sortedInputs.map((input) => {
    const selected: CombinedWindow[] = [];
    let effective = 0;
    let real = 0;
    const candidates = [...input.windows]
      .filter((window) => window.category !== "BAD" && window.effectiveDurationMinutes > 0)
      .sort((a, b) => windowPriority(b, input.target, overrides) - windowPriority(a, input.target, overrides));

    for (const window of candidates) {
      if (effective >= input.targetEffectiveMinutes) break;
      const date = windowDate(window);
      if (overrides.excludeFromTotalsDates.includes(date) || overrides.previewOnlyDates.includes(date)) continue;
      if (occupied.some((existing) => overlaps(existing, window))) continue;
      const combined = toCombinedWindow(window, input.target, input.object, true, true);
      selected.push(combined);
      occupied.push(window);
      effective += combined.effectiveDurationMinutes;
      real += combined.durationMinutes;
    }

    for (const date of overrides.includeInTotalsDates) {
      if (selected.some((window) => window.dateStart === date)) continue;
      const forced = candidates.find((window) => windowDate(window) === date && !occupied.some((existing) => overlaps(existing, window)));
      if (!forced) continue;
      const combined = toCombinedWindow(forced, input.target, input.object, true, true);
      combined.selectionStatus = "manuallyIncluded";
      selected.push(combined);
      occupied.push(forced);
      effective += combined.effectiveDurationMinutes;
      real += combined.durationMinutes;
    }

    return {
      target: input.target,
      object: input.object,
      targetEffectiveMinutes: input.targetEffectiveMinutes,
      selectedWindows: selected.sort((a, b) => a.startUtc.localeCompare(b.startUtc)),
      effectiveDurationMinutes: effective,
      realDurationMinutes: real
    };
  });
}

export function markAllCandidateWindows(
  inputs: AllocationInput[],
  allocated: AllocatedTargetWindows[],
  overrides: CalendarOverrides
): CombinedWindow[] {
  const selectedKeys = new Set(
    allocated.flatMap((entry) => entry.selectedWindows.map((window) => `${window.targetId}-${window.startUtc}-${window.endUtc}`))
  );

  return inputs.flatMap((input) =>
    input.windows.map((window) => {
      const key = `${input.target.id}-${window.startUtc}-${window.endUtc}`;
      const date = windowDate(window);
      const excluded = overrides.excludeFromTotalsDates.includes(date);
      const previewOnly = overrides.previewOnlyDates.includes(date);
      const includeInTotals = selectedKeys.has(key) && !excluded && !previewOnly;
      const combined = toCombinedWindow(window, input.target, input.object, includeInTotals, selectedKeys.has(key));
      if (excluded) combined.selectionStatus = "excluded";
      else if (previewOnly) combined.selectionStatus = "previewOnly";
      else if (overrides.includeInTotalsDates.includes(date) && selectedKeys.has(key)) combined.selectionStatus = "manuallyIncluded";
      else if (overrides.preferredDates.includes(date)) combined.selectionStatus = "preferred";
      combined.totalStatus = includeInTotals ? "countsInTotal" : "ignoredInTotal";
      return combined;
    })
  );
}
