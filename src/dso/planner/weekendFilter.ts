import { Temporal } from "@js-temporal/polyfill";
import type { DsoDateExceptions } from "../types";

export function dsoNightLabel(startDate: string): string {
  const start = Temporal.PlainDate.from(startDate);
  const end = start.add({ days: 1 });
  return `${start.toString()} -> ${end.toString()}`;
}

export function enumerateNightStartDates(startDate: string, endDate: string): string[] {
  const start = Temporal.PlainDate.from(startDate);
  const end = Temporal.PlainDate.from(endDate);
  const dates: string[] = [];
  let current = start;
  while (Temporal.PlainDate.compare(current, end) <= 0) {
    dates.push(current.toString());
    current = current.add({ days: 1 });
  }
  return dates;
}

export function isWeekendNight(date: string): boolean {
  const dayOfWeek = Temporal.PlainDate.from(date).dayOfWeek;
  return dayOfWeek === 5 || dayOfWeek === 6;
}

export function shouldIncludeNight(date: string, weekendOnly: boolean, exceptions: DsoDateExceptions): {
  include: boolean;
  status: "included" | "excluded" | "forced";
  reason: string;
} {
  if (exceptions.exclude.includes(date)) {
    return { include: false, status: "excluded", reason: "excluded manually" };
  }
  if (exceptions.forceInclude.includes(date)) {
    return { include: true, status: "forced", reason: "forced manually" };
  }
  if (weekendOnly && !isWeekendNight(date)) {
    return { include: false, status: "excluded", reason: "weekend filter" };
  }
  return { include: true, status: "included", reason: weekendOnly ? "weekend night" : "date range" };
}
