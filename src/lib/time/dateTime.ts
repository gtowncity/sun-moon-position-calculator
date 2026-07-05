import { Temporal } from "@js-temporal/polyfill";
import { isValidTimeZone } from "./timeZones";

export type LocalDateTimeStatus = "ok" | "ambiguous" | "gap" | "invalid";

export interface LocalDateTimeResult {
  status: LocalDateTimeStatus;
  instant?: Temporal.Instant;
  messageKey?: "dstGap" | "dstAmbiguous" | "invalidDate" | "invalidTime" | "invalidTimeZone";
}

export interface IntervalResult {
  instants: Temporal.Instant[];
  warnings: Array<"dstAmbiguous" | "tooManyRows">;
}

export const maxTimePoints = 10000;

function samePlainDateTime(zoned: Temporal.ZonedDateTime, plain: Temporal.PlainDateTime): boolean {
  return (
    zoned.year === plain.year &&
    zoned.month === plain.month &&
    zoned.day === plain.day &&
    zoned.hour === plain.hour &&
    zoned.minute === plain.minute &&
    zoned.second === plain.second
  );
}

export function toLocalDate(instant: Temporal.Instant, timeZone: string): string {
  return instant.toZonedDateTimeISO(timeZone).toPlainDate().toString();
}

export function toLocalTime(instant: Temporal.Instant, timeZone: string): string {
  return instant.toZonedDateTimeISO(timeZone).toPlainTime().toString({ smallestUnit: "second" });
}

export function getNowParts(timeZone: string): { date: string; time: string } {
  const now = Temporal.Now.instant().toZonedDateTimeISO(timeZone);
  return {
    date: now.toPlainDate().toString(),
    time: now.toPlainTime().toString({ smallestUnit: "minute" })
  };
}

export function localDateTimeToInstant(
  date: string,
  time: string,
  timeZone: string
): LocalDateTimeResult {
  if (!isValidTimeZone(timeZone)) {
    return { status: "invalid", messageKey: "invalidTimeZone" };
  }

  let plain: Temporal.PlainDateTime;

  try {
    plain = Temporal.PlainDateTime.from(`${date}T${time}`);
  } catch {
    return { status: "invalid", messageKey: date ? "invalidTime" : "invalidDate" };
  }

  try {
    const earlier = plain.toZonedDateTime(timeZone, { disambiguation: "earlier" });
    const later = plain.toZonedDateTime(timeZone, { disambiguation: "later" });
    const earlierMatches = samePlainDateTime(earlier, plain);
    const laterMatches = samePlainDateTime(later, plain);

    if (earlierMatches && laterMatches && earlier.epochNanoseconds !== later.epochNanoseconds) {
      return { status: "ambiguous", instant: earlier.toInstant(), messageKey: "dstAmbiguous" };
    }

    if (!earlierMatches || !laterMatches) {
      return { status: "gap", messageKey: "dstGap" };
    }

    return { status: "ok", instant: earlier.toInstant() };
  } catch {
    return { status: "invalid", messageKey: "invalidTime" };
  }
}

export function generateIntervalInstants(
  start: Temporal.Instant,
  end: Temporal.Instant,
  intervalMinutes: number,
  rowLimit = maxTimePoints
): IntervalResult {
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    throw new Error("Interval must be greater than zero.");
  }

  if (Temporal.Instant.compare(end, start) <= 0) {
    throw new Error("End must be after start.");
  }

  const instants: Temporal.Instant[] = [];
  let current = start;
  const step = Temporal.Duration.from({ minutes: intervalMinutes });

  while (Temporal.Instant.compare(current, end) <= 0) {
    if (instants.length >= rowLimit) {
      return { instants, warnings: ["tooManyRows"] };
    }
    instants.push(current);
    current = current.add(step);
  }

  return { instants, warnings: [] };
}

export function addHours(instant: Temporal.Instant, hours: number): Temporal.Instant {
  return instant.add(Temporal.Duration.from({ hours }));
}
