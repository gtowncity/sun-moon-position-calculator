import { Temporal } from "@js-temporal/polyfill";
import type { CalculationOptions, CelestialBody, ObserverLocation, ResultRow, TargetBody } from "../../types";
import { toLocalDate, toLocalTime } from "../time/dateTime";
import { calculateSolarPosition } from "../../astro/solar/position";
import { calculateLunarPosition } from "../../astro/lunar/position";
import { normalizeRefractionSettings } from "../../astro/common/refraction";

export interface CalculationInput {
  instants: Temporal.Instant[];
  observer: ObserverLocation;
  bodySelection: TargetBody;
  timeZone: string;
  options?: Partial<CalculationOptions>;
}

export function expandBodySelection(selection: TargetBody): CelestialBody[] {
  if (selection === "both") {
    return ["sun", "moon"];
  }

  return [selection];
}

export { moonPhaseName } from "../../astro/common/position";

export function calculatePositions(input: CalculationInput): ResultRow[] {
  const bodies = expandBodySelection(input.bodySelection);
  const rows: ResultRow[] = [];
  const refraction = normalizeRefractionSettings(input.options?.refraction);
  let index = 1;

  for (const instant of input.instants) {
    const date = new Date(Number(instant.epochMilliseconds));

    for (const body of bodies) {
      const position = body === "sun"
        ? calculateSolarPosition(date, input.observer, refraction)
        : calculateLunarPosition(date, input.observer, refraction);

      rows.push({
        index,
        localDate: toLocalDate(instant, input.timeZone),
        localTime: toLocalTime(instant, input.timeZone),
        timeZone: input.timeZone,
        utcTime: instant.toString(),
        latitude: input.observer.latitude,
        longitude: input.observer.longitude,
        elevationMeters: input.observer.elevationMeters,
        body,
        azimuthDeg: position.azimuthDeg,
        apparentAltitudeDeg: position.apparentAltitudeDeg,
        geometricAltitudeDeg: position.geometricAltitudeDeg,
        apparentZenithDeg: position.apparentZenithDeg,
        geometricZenithDeg: position.geometricZenithDeg,
        altitudeDeg: position.geometricAltitudeDeg,
        zenithDeg: position.geometricZenithDeg,
        rightAscension: position.rightAscension,
        declinationDeg: position.declinationDeg,
        distanceKm: position.distanceKm,
        phaseName: position.phaseName,
        illuminationPercent: position.illuminationPercent,
        warnings: position.warnings,
        algorithm: position.algorithm
      });
      index += 1;
    }
  }

  return rows;
}
