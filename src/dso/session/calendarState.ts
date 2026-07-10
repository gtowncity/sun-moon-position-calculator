import type { DsoNightPlan } from "../types";
import type {
  CalendarDataCategoryStatus,
  CalendarOverrides,
  CalendarQualityStatus,
  CalendarSelectionStatus,
  CombinedWindow,
  SessionCalendarDay
} from "./sessionTypes";
import { categoryToDataStatus } from "./sessionTypes";

const qualityRank: Record<CalendarQualityStatus, number> = {
  excellent: 5,
  good: 4,
  usable: 3,
  poor: 2,
  bad: 1
};

const dataRank: Record<CalendarDataCategoryStatus, number> = {
  main: 5,
  extra: 4,
  test: 3,
  bad: 2,
  none: 1
};

function bestQuality(values: CalendarQualityStatus[]): CalendarQualityStatus {
  return values.sort((a, b) => qualityRank[b] - qualityRank[a])[0] ?? "bad";
}

function bestDataStatus(values: CalendarDataCategoryStatus[]): CalendarDataCategoryStatus {
  return values.sort((a, b) => dataRank[b] - dataRank[a])[0] ?? "none";
}

function qualityFromNight(night: DsoNightPlan | undefined): CalendarQualityStatus {
  return night?.overallNightRating ?? "bad";
}

function selectionForDate(date: string, selected: CombinedWindow[], overrides: CalendarOverrides): CalendarSelectionStatus {
  if (overrides.excludeFromTotalsDates.includes(date)) return "excluded";
  if (overrides.previewOnlyDates.includes(date)) return "previewOnly";
  if (overrides.includeInTotalsDates.includes(date)) return "manuallyIncluded";
  if (overrides.preferredDates.includes(date)) return "preferred";
  if (selected.length > 0) return "selectedForTarget";
  return "neutral";
}

export function buildSessionCalendarDays(
  dates: string[],
  nightsByDateByObject: Map<string, DsoNightPlan[]>,
  combinedWindows: CombinedWindow[],
  overrides: CalendarOverrides
): SessionCalendarDay[] {
  return dates.map((date) => {
    const nights = nightsByDateByObject.get(date) ?? [];
    const dateWindows = combinedWindows.filter((window) => window.dateStart === date);
    const selected = dateWindows.filter((window) => window.includeInTotals);
    const bestWindow = [...dateWindows].sort((a, b) => b.averageScore - a.averageScore)[0] ?? null;
    const selectionStatus = selectionForDate(date, selected, overrides);
    const countsInTotal = selected.length > 0 && selectionStatus !== "excluded" && selectionStatus !== "previewOnly";
    const qualityStatus = bestQuality([
      ...nights.map(qualityFromNight),
      ...dateWindows.map((window) => window.qualityStatus)
    ]);
    const dataCategoryStatus = bestDataStatus([
      ...selected.map((window) => window.dataCategoryStatus),
      categoryToDataStatus(bestWindow?.category)
    ]);

    return {
      date,
      nightLabel: nights[0]?.nightLabel ?? `${date} -> ?`,
      qualityStatus,
      dataCategoryStatus,
      selectionStatus,
      totalStatus: countsInTotal ? "countsInTotal" : "ignoredInTotal",
      countsInTotal,
      bestWindowStart: bestWindow?.startLocal ?? nights[0]?.bestWindowStart ?? null,
      bestWindowEnd: bestWindow?.endLocal ?? nights[0]?.bestWindowEnd ?? null,
      effectiveMinutes: selected.reduce((total, window) => total + window.effectiveDurationMinutes, 0),
      realMinutes: selected.reduce((total, window) => total + window.durationMinutes, 0),
      objectIds: [...new Set(selected.map((window) => window.objectId))],
      objectNames: [...new Set(selected.map((window) => window.objectName))],
      warnings: [...new Set(nights.flatMap((night) => night.mainWarnings))].slice(0, 5)
    };
  });
}
