import { Observer, SearchHourAngle, SearchRiseSet } from "astronomy-engine";
import { Temporal } from "@js-temporal/polyfill";
import type { CelestialBody, EventKind, EventResult, ObserverLocation, RefractionSettings, TargetBody } from "../domain/types";
import { bodyMap, calculateBodyPosition } from "./common/position";
import { toLocalDate, toLocalTime } from "../lib/time/dateTime";

export interface DailyEventsInput {
  observer: ObserverLocation;
  bodySelection: TargetBody;
  timeZone: string;
  localDate: string;
  refraction: RefractionSettings;
}

function expandTargetBodies(selection: TargetBody): CelestialBody[] {
  return selection === "both" ? ["sun", "moon"] : [selection];
}

function instantFromLocalMidnight(localDate: string, timeZone: string): Temporal.Instant {
  return Temporal.PlainDate.from(localDate).toZonedDateTime({ timeZone, plainTime: Temporal.PlainTime.from("00:00") }).toInstant();
}

function nextLocalMidnight(localDate: string, timeZone: string): Temporal.Instant {
  return Temporal.PlainDate.from(localDate).add({ days: 1 }).toZonedDateTime({ timeZone, plainTime: Temporal.PlainTime.from("00:00") }).toInstant();
}

function astroDateToInstant(date: Date): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

function isInsideDay(instant: Temporal.Instant, dayStart: Temporal.Instant, dayEnd: Temporal.Instant): boolean {
  return Temporal.Instant.compare(instant, dayStart) >= 0 && Temporal.Instant.compare(instant, dayEnd) < 0;
}

function notFoundEvent(body: CelestialBody, kind: EventKind, timeZone: string): EventResult {
  const warning = kind === "rise" ? "noRise" : kind === "set" ? "noSet" : "noTransit";
  return {
    body,
    kind,
    status: "not_found",
    localDate: null,
    localTime: null,
    timeZone,
    utcTime: null,
    azimuthDeg: null,
    apparentAltitudeDeg: null,
    geometricAltitudeDeg: null,
    warning
  };
}

function foundEvent(
  body: CelestialBody,
  kind: EventKind,
  date: Date,
  observerLocation: ObserverLocation,
  timeZone: string,
  refraction: RefractionSettings
): EventResult {
  const instant = astroDateToInstant(date);
  const position = calculateBodyPosition(body, date, observerLocation, refraction);

  return {
    body,
    kind,
    status: "found",
    localDate: toLocalDate(instant, timeZone),
    localTime: toLocalTime(instant, timeZone),
    timeZone,
    utcTime: instant.toString(),
    azimuthDeg: position.azimuthDeg,
    apparentAltitudeDeg: position.apparentAltitudeDeg,
    geometricAltitudeDeg: position.geometricAltitudeDeg,
    warning: position.warnings[0] ?? null
  };
}

function riseSetEvent(
  body: CelestialBody,
  kind: "rise" | "set",
  observer: Observer,
  observerLocation: ObserverLocation,
  dayStart: Temporal.Instant,
  dayEnd: Temporal.Instant,
  timeZone: string,
  refraction: RefractionSettings
): EventResult {
  try {
    const direction = kind === "rise" ? +1 : -1;
    const result = SearchRiseSet(bodyMap[body], observer, direction, new Date(Number(dayStart.epochMilliseconds)), 1);

    if (!result) {
      return notFoundEvent(body, kind, timeZone);
    }

    const instant = astroDateToInstant(result.date);
    if (!isInsideDay(instant, dayStart, dayEnd)) {
      return notFoundEvent(body, kind, timeZone);
    }

    return foundEvent(body, kind, result.date, observerLocation, timeZone, refraction);
  } catch {
    return notFoundEvent(body, kind, timeZone);
  }
}

function transitEvent(
  body: CelestialBody,
  observer: Observer,
  observerLocation: ObserverLocation,
  dayStart: Temporal.Instant,
  dayEnd: Temporal.Instant,
  timeZone: string,
  refraction: RefractionSettings
): EventResult {
  try {
    const result = SearchHourAngle(bodyMap[body], observer, 0, new Date(Number(dayStart.epochMilliseconds)), +1);
    const instant = astroDateToInstant(result.time.date);

    if (!isInsideDay(instant, dayStart, dayEnd)) {
      return notFoundEvent(body, "transit", timeZone);
    }

    return foundEvent(body, "transit", result.time.date, observerLocation, timeZone, refraction);
  } catch {
    return notFoundEvent(body, "transit", timeZone);
  }
}

export function calculateDailyEvents(input: DailyEventsInput): EventResult[] {
  const observer = new Observer(input.observer.latitude, input.observer.longitude, input.observer.elevationMeters);
  const dayStart = instantFromLocalMidnight(input.localDate, input.timeZone);
  const dayEnd = nextLocalMidnight(input.localDate, input.timeZone);
  const events: EventResult[] = [];

  for (const body of expandTargetBodies(input.bodySelection)) {
    events.push(riseSetEvent(body, "rise", observer, input.observer, dayStart, dayEnd, input.timeZone, input.refraction));
    events.push(riseSetEvent(body, "set", observer, input.observer, dayStart, dayEnd, input.timeZone, input.refraction));
    events.push(transitEvent(body, observer, input.observer, dayStart, dayEnd, input.timeZone, input.refraction));
  }

  return events;
}
