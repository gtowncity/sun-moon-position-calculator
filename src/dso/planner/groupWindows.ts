import { Temporal } from "@js-temporal/polyfill";
import type { DsoCategory, DsoInterval, DsoWindow } from "../types";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function uniqueTop(values: string[], limit = 4): string[] {
  return [...new Set(values.filter(Boolean))].slice(0, limit);
}

function localTime(utcTime: string, timeZone: string): string {
  return Temporal.Instant.from(utcTime)
    .toZonedDateTimeISO(timeZone)
    .toPlainTime()
    .toString({ smallestUnit: "minute" });
}

function addMinutes(utcTime: string, minutes: number): string {
  return Temporal.Instant.from(utcTime).add({ minutes }).toString();
}

function createWindow(
  intervals: DsoInterval[],
  category: DsoCategory,
  intervalMinutes: number,
  objectId: string,
  objectName: string,
  timeZone: string
): DsoWindow {
  const startUtc = intervals[0].utcDateTime;
  const endUtc = addMinutes(intervals[intervals.length - 1].utcDateTime, intervalMinutes);
  const scores = intervals.map((interval) => interval.finalDsoScore);

  return {
    nightLabel: intervals[0].nightLabel,
    objectId,
    objectName,
    startUtc,
    endUtc,
    startLocal: localTime(startUtc, timeZone),
    endLocal: localTime(endUtc, timeZone),
    durationMinutes: intervals.length * intervalMinutes,
    effectiveDurationMinutes: intervals.reduce((total, interval) => total + interval.effectiveWeight * intervalMinutes, 0),
    averageScore: average(scores),
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
    category,
    averageSunAltitude: average(intervals.map((interval) => interval.sunAltitudeDeg)),
    averageMoonIllumination: average(intervals.map((interval) => interval.moonIlluminationPercent)),
    averageMoonAltitude: average(intervals.map((interval) => interval.moonAltitudeDeg)),
    averageMoonDistance: average(intervals.map((interval) => interval.angularSeparationMoonTargetDeg)),
    averageTargetAltitude: average(intervals.map((interval) => interval.targetAltitudeDeg)),
    maxTargetAltitude: Math.max(...intervals.map((interval) => interval.targetAltitudeDeg)),
    reasonsSummary: uniqueTop(intervals.flatMap((interval) => interval.reasons)),
    warningsSummary: uniqueTop(intervals.flatMap((interval) => interval.warnings))
  };
}

export function groupDsoWindows(
  intervals: DsoInterval[],
  intervalMinutes: number,
  objectId: string,
  objectName: string,
  timeZone: string
): DsoWindow[] {
  if (intervals.length === 0) return [];

  const windows: DsoWindow[] = [];
  let currentCategory = intervals[0].category;
  let currentGroup: DsoInterval[] = [];

  for (const interval of intervals) {
    if (interval.category !== currentCategory && currentGroup.length > 0) {
      windows.push(createWindow(currentGroup, currentCategory, intervalMinutes, objectId, objectName, timeZone));
      currentGroup = [];
      currentCategory = interval.category;
    }
    currentGroup.push(interval);
  }

  if (currentGroup.length > 0) {
    windows.push(createWindow(currentGroup, currentCategory, intervalMinutes, objectId, objectName, timeZone));
  }

  return windows;
}
