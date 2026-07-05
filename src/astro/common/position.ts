import { Body, Equator, Horizon, Illumination, KM_PER_AU, MoonPhase, Observer } from "astronomy-engine";
import type { CalculationWarning, CelestialBody, MoonPhaseName, ObserverLocation, RefractionSettings } from "../../domain/types";
import { isNearHorizon, normalizeDegrees, zenithFromAltitude } from "./angles";
import { applyCustomRefraction } from "./refraction";

export interface BodyPosition {
  body: CelestialBody;
  azimuthDeg: number;
  apparentAltitudeDeg: number;
  geometricAltitudeDeg: number;
  apparentZenithDeg: number;
  geometricZenithDeg: number;
  rightAscension: number;
  declinationDeg: number;
  distanceKm: number | null;
  phaseName: MoonPhaseName | null;
  illuminationPercent: number | null;
  warnings: CalculationWarning[];
  algorithm: string;
}

export const bodyMap: Record<CelestialBody, Body> = {
  sun: Body.Sun,
  moon: Body.Moon
};

export function moonPhaseName(phaseDegrees: number): MoonPhaseName {
  const normalized = normalizeDegrees(phaseDegrees);

  if (normalized < 22.5 || normalized >= 337.5) return "newMoon";
  if (normalized < 67.5) return "waxingCrescent";
  if (normalized < 112.5) return "firstQuarter";
  if (normalized < 157.5) return "waxingGibbous";
  if (normalized < 202.5) return "fullMoon";
  if (normalized < 247.5) return "waningGibbous";
  if (normalized < 292.5) return "thirdQuarter";
  return "waningCrescent";
}

export function calculateBodyPosition(
  body: CelestialBody,
  date: Date,
  observerLocation: ObserverLocation,
  refraction: RefractionSettings
): BodyPosition {
  const observer = new Observer(observerLocation.latitude, observerLocation.longitude, observerLocation.elevationMeters);
  const astronomyBody = bodyMap[body];
  const equatorial = Equator(astronomyBody, date, observer, true, true);
  const geometricHorizontal = Horizon(date, observer, equatorial.ra, equatorial.dec);
  const standardApparentHorizontal = Horizon(date, observer, equatorial.ra, equatorial.dec, "normal");
  const geometricAltitudeDeg = geometricHorizontal.altitude;
  const apparentAltitudeDeg =
    refraction.mode === "standard"
      ? standardApparentHorizontal.altitude
      : applyCustomRefraction(geometricAltitudeDeg, refraction);
  const illumination = body === "moon" ? Illumination(Body.Moon, date) : null;
  const phase = body === "moon" ? MoonPhase(date) : null;
  const warnings: CalculationWarning[] = [];

  if (isNearHorizon(geometricAltitudeDeg) || isNearHorizon(apparentAltitudeDeg)) {
    warnings.push("nearHorizon");
  }

  return {
    body,
    azimuthDeg: normalizeDegrees(geometricHorizontal.azimuth),
    apparentAltitudeDeg,
    geometricAltitudeDeg,
    apparentZenithDeg: zenithFromAltitude(apparentAltitudeDeg),
    geometricZenithDeg: zenithFromAltitude(geometricAltitudeDeg),
    rightAscension: equatorial.ra,
    declinationDeg: equatorial.dec,
    distanceKm: Number.isFinite(equatorial.dist) ? equatorial.dist * KM_PER_AU : null,
    phaseName: phase === null ? null : moonPhaseName(phase),
    illuminationPercent: illumination === null ? null : illumination.phase_fraction * 100,
    warnings,
    algorithm: "astronomy-engine topocentric equator/horizon"
  };
}
