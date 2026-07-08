import { Temporal } from "@js-temporal/polyfill";
import type { ObserverLocation } from "../../types";
import type { TargetAltAz } from "../types";
import { degToRad, normalizeDegrees, normalizeSignedDegrees, radToDeg } from "./angles";

export function julianDate(instant: Temporal.Instant): number {
  return Number(instant.epochMilliseconds) / 86400000 + 2440587.5;
}

export function greenwichMeanSiderealTimeDeg(instant: Temporal.Instant): number {
  const jd = julianDate(instant);
  const t = (jd - 2451545.0) / 36525;
  return normalizeDegrees(
    280.46061837 +
      360.98564736629 * (jd - 2451545.0) +
      0.000387933 * t * t -
      (t * t * t) / 38710000
  );
}

export function localSiderealTimeDeg(instant: Temporal.Instant, longitudeDeg: number): number {
  return normalizeDegrees(greenwichMeanSiderealTimeDeg(instant) + longitudeDeg);
}

export function equatorialToHorizontal(
  raHours: number,
  decDeg: number,
  instant: Temporal.Instant,
  observer: ObserverLocation
): TargetAltAz {
  const raDeg = raHours * 15;
  const lst = localSiderealTimeDeg(instant, observer.longitude);
  const hourAngleDeg = normalizeSignedDegrees(lst - raDeg);
  const hourAngle = degToRad(hourAngleDeg);
  const dec = degToRad(decDeg);
  const lat = degToRad(observer.latitude);

  const sinAltitude =
    Math.sin(dec) * Math.sin(lat) +
    Math.cos(dec) * Math.cos(lat) * Math.cos(hourAngle);
  const altitudeDeg = radToDeg(Math.asin(Math.max(-1, Math.min(1, sinAltitude))));

  const azimuthRad = Math.atan2(
    -Math.sin(hourAngle),
    Math.tan(dec) * Math.cos(lat) - Math.sin(lat) * Math.cos(hourAngle)
  );

  return {
    altitudeDeg,
    azimuthDeg: normalizeDegrees(radToDeg(azimuthRad)),
    hourAngleDeg
  };
}
