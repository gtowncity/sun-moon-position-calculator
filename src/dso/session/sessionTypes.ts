import type { DeepSkyObject, DsoCategory, DsoPlan, DsoPlannerSettings, DsoWindow } from "../types";

export type SessionAllocationMode = "equal" | "manual" | "priority";

export type CalendarQualityStatus = "excellent" | "good" | "usable" | "poor" | "bad";
export type CalendarDataCategoryStatus = "main" | "extra" | "test" | "bad" | "none";
export type CalendarSelectionStatus =
  | "selectedForTarget"
  | "manuallyIncluded"
  | "previewOnly"
  | "excluded"
  | "preferred"
  | "neutral";
export type CalendarTotalStatus = "countsInTotal" | "ignoredInTotal";

export interface SessionTarget {
  id: string;
  objectId: string;
  targetEffectiveHours: number;
  priority: number;
  enabled: boolean;
  isPrimary?: boolean;
}

export interface CalendarOverrides {
  includeInTotalsDates: string[];
  excludeFromTotalsDates: string[];
  preferredDates: string[];
  previewOnlyDates: string[];
}

export interface SessionPlannerRequest {
  baseSettings: DsoPlannerSettings;
  targets: SessionTarget[];
  allocationMode: SessionAllocationMode;
  totalTargetEffectiveHours: number;
  calendarOverrides: CalendarOverrides;
}

export interface CombinedWindow extends DsoWindow {
  targetId: string;
  object: DeepSkyObject;
  dateStart: string;
  qualityStatus: CalendarQualityStatus;
  dataCategoryStatus: CalendarDataCategoryStatus;
  selectionStatus: CalendarSelectionStatus;
  totalStatus: CalendarTotalStatus;
  includeInTotals: boolean;
}

export interface SessionTargetPlan {
  target: SessionTarget;
  object: DeepSkyObject;
  plan: DsoPlan;
  targetEffectiveMinutes: number;
  selectedWindows: CombinedWindow[];
  effectiveDurationMinutes: number;
  realDurationMinutes: number;
  reached: boolean;
  remainingEffectiveMinutes: number;
}

export interface SessionCalendarDay {
  date: string;
  nightLabel: string;
  qualityStatus: CalendarQualityStatus;
  dataCategoryStatus: CalendarDataCategoryStatus;
  selectionStatus: CalendarSelectionStatus;
  totalStatus: CalendarTotalStatus;
  countsInTotal: boolean;
  bestWindowStart: string | null;
  bestWindowEnd: string | null;
  effectiveMinutes: number;
  realMinutes: number;
  objectIds: string[];
  objectNames: string[];
  warnings: string[];
}

export interface SessionPlan {
  generatedAtUtc: string;
  allocationMode: SessionAllocationMode;
  targets: SessionTarget[];
  objectPlans: SessionTargetPlan[];
  combinedWindows: CombinedWindow[];
  calendarDays: SessionCalendarDay[];
  totals: {
    targetEffectiveMinutes: number;
    plannedEffectiveMinutes: number;
    realDurationMinutes: number;
    selectedWindowCount: number;
    selectedNightCount: number;
    reached: boolean;
  };
  warnings: string[];
}

export function emptyCalendarOverrides(): CalendarOverrides {
  return {
    includeInTotalsDates: [],
    excludeFromTotalsDates: [],
    preferredDates: [],
    previewOnlyDates: []
  };
}

export function categoryToDataStatus(category: DsoCategory | null | undefined): CalendarDataCategoryStatus {
  if (category === "MAIN") return "main";
  if (category === "EXTRA") return "extra";
  if (category === "TEST") return "test";
  if (category === "BAD") return "bad";
  return "none";
}
