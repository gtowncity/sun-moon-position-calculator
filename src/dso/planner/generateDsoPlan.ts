import { Temporal } from "@js-temporal/polyfill";
import { calculateLunarPosition } from "../../astro/lunar/position";
import { calculateSolarPosition } from "../../astro/solar/position";
import { standardPressureHpa, standardTemperatureC } from "../../astro/common/refraction";
import { getMessierObject } from "../catalog/messierCatalog";
import { setupMoonTwilightSensitivityMultiplier } from "../catalog/objectProfiles";
import { airmassApprox } from "../math/airmass";
import { angularSeparationDeg } from "../math/angles";
import { equatorialToHorizontal } from "../math/altAz";
import { calculateAltitudeScore } from "../scoring/altitudeScore";
import { calculateFinalDsoScore } from "../scoring/dsoScore";
import { calculateMoonScore } from "../scoring/moonScore";
import { calculateSunScore, twilightClassForSunAltitude } from "../scoring/sunScore";
import type { DeepSkyObject, DsoInterval, DsoNightPlan, DsoPlan, DsoPlannerSettings, PlanningProfile } from "../types";
import { planTargetEffectiveIntegration } from "./effectiveIntegration";
import { groupDsoWindows } from "./groupWindows";
import { dsoNightLabel, enumerateNightStartDates, shouldIncludeNight } from "./weekendFilter";

const standardRefraction = {
  mode: "standard" as const,
  pressureHpa: standardPressureHpa,
  temperatureC: standardTemperatureC
};

function localDateTimeLabel(instant: Temporal.Instant, timeZone: string): string {
  const zoned = instant.toZonedDateTimeISO(timeZone);
  return `${zoned.toPlainDate().toString()} ${zoned.toPlainTime().toString({ smallestUnit: "minute" })}`;
}

function localTimeLabel(instant: Temporal.Instant, timeZone: string): string {
  return instant.toZonedDateTimeISO(timeZone).toPlainTime().toString({ smallestUnit: "minute" });
}

function nightStartEndInstants(date: string, timeZone: string): { start: Temporal.Instant; end: Temporal.Instant } {
  const startDate = Temporal.PlainDate.from(date);
  const start = startDate.toZonedDateTime({ timeZone, plainTime: Temporal.PlainTime.from("16:00") }).toInstant();
  const end = startDate.add({ days: 1 }).toZonedDateTime({ timeZone, plainTime: Temporal.PlainTime.from("10:00") }).toInstant();
  return { start, end };
}

function intervalInstants(start: Temporal.Instant, end: Temporal.Instant, intervalMinutes: number): Temporal.Instant[] {
  const instants: Temporal.Instant[] = [];
  let current = start;
  while (Temporal.Instant.compare(current, end) < 0) {
    instants.push(current);
    current = current.add({ minutes: intervalMinutes });
  }
  return instants;
}

function adjustedProfile(profile: PlanningProfile, altitudeOffset: number): PlanningProfile {
  return {
    ...profile,
    minUsableAltitudeDeg: Math.max(0, profile.minUsableAltitudeDeg + altitudeOffset),
    minMainAltitudeDeg: Math.max(0, profile.minMainAltitudeDeg + altitudeOffset),
    idealAltitudeDeg: Math.max(25, profile.idealAltitudeDeg + altitudeOffset * 0.6)
  };
}

function intervalTargetTrend(hourAngleDeg: number): "rising" | "setting" | "transit" {
  if (Math.abs(hourAngleDeg) < 4) return "transit";
  return hourAngleDeg < 0 ? "rising" : "setting";
}

function firstLocalTimeWhere(intervals: DsoInterval[], predicate: (interval: DsoInterval) => boolean): string | null {
  return intervals.find(predicate)?.localDateTime.slice(11, 16) ?? null;
}

function lastLocalTimeWhere(intervals: DsoInterval[], predicate: (interval: DsoInterval) => boolean, intervalMinutes: number, timeZone: string): string | null {
  const last = [...intervals].reverse().find(predicate);
  if (!last) return null;
  return localTimeLabel(Temporal.Instant.from(last.utcDateTime).add({ minutes: intervalMinutes }), timeZone);
}

function minutesAbove(intervals: DsoInterval[], thresholdDeg: number, intervalMinutes: number): number {
  return intervals.filter((interval) => interval.targetAltitudeDeg >= thresholdDeg).length * intervalMinutes;
}

function categoryMinutes(intervals: DsoInterval[], category: DsoInterval["category"], intervalMinutes: number): number {
  return intervals.filter((interval) => interval.category === category).length * intervalMinutes;
}

function rateNight(mainDuration: number, effectiveDuration: number, bestAverageScore: number): DsoNightPlan["overallNightRating"] {
  if (mainDuration >= 180 && bestAverageScore >= 86) return "excellent";
  if (mainDuration >= 90 && bestAverageScore >= 78) return "good";
  if (effectiveDuration >= 60 && bestAverageScore >= 58) return "usable";
  if (effectiveDuration > 0) return "poor";
  return "bad";
}

function unique(values: string[], limit = 6): string[] {
  return [...new Set(values.filter(Boolean))].slice(0, limit);
}

function calculateNight(date: string, settings: DsoPlannerSettings, object: DeepSkyObject): DsoNightPlan {
  const { start, end } = nightStartEndInstants(date, settings.timeZone);
  const instants = intervalInstants(start, end, settings.intervalMinutes);
  const label = dsoNightLabel(date);
  const profile = adjustedProfile(object.planningProfile, settings.qualityProfile.altitudeStrictnessOffsetDeg);
  const scoringObject: DeepSkyObject = { ...object, planningProfile: profile };
  const raw = instants.map((instant) => {
    const dateObj = new Date(Number(instant.epochMilliseconds));
    const sun = calculateSolarPosition(dateObj, settings.location, standardRefraction);
    const moon = calculateLunarPosition(dateObj, settings.location, standardRefraction);
    const target = equatorialToHorizontal(object.raHours, object.decDeg, instant, settings.location);
    const moonDistance = angularSeparationDeg(moon.rightAscension * 15, moon.declinationDeg, object.raDeg, object.decDeg);
    return { instant, sun, moon, target, moonDistance };
  });
  const targetMax = raw.reduce((best, sample) => sample.target.altitudeDeg > best.target.altitudeDeg ? sample : best, raw[0]!);
  const targetMaxAltitude = targetMax.target.altitudeDeg;
  const targetCulminationTime = localTimeLabel(targetMax.instant, settings.timeZone);
  const moonMultiplier = settings.qualityProfile.moonPenaltyMultiplier * setupMoonTwilightSensitivityMultiplier(settings.setupProfile);

  const intervals: DsoInterval[] = raw.map((sample, index) => {
    const sunScore = calculateSunScore(sample.sun.geometricAltitudeDeg, profile);
    const altitudeScore = calculateAltitudeScore(sample.target.altitudeDeg, profile);
    const moonScore = calculateMoonScore(
      sample.moon.geometricAltitudeDeg,
      sample.moon.illuminationPercent ?? 0,
      sample.moonDistance,
      profile,
      moonMultiplier
    );
    const score = calculateFinalDsoScore({
      object: scoringObject,
      sunAltitudeDeg: sample.sun.geometricAltitudeDeg,
      sunScore,
      moonScore: moonScore.score,
      moonIlluminationPercent: sample.moon.illuminationPercent ?? 0,
      moonAltitudeDeg: sample.moon.geometricAltitudeDeg,
      moonDistanceDeg: sample.moonDistance,
      targetAltitudeDeg: sample.target.altitudeDeg,
      targetAltitudeScore: altitudeScore,
      qualityProfile: settings.qualityProfile,
      setupProfile: settings.setupProfile,
      bortle: settings.bortle,
      sqm: settings.sqm
    });
    const reasons = [
      `Sun ${sample.sun.geometricAltitudeDeg.toFixed(1)} deg, target ${sample.target.altitudeDeg.toFixed(1)} deg.`,
      moonScore.reason,
      ...profile.notes.slice(0, 2),
      ...score.reasons
    ];
    const warnings = [
      ...(sample.target.altitudeDeg < 25 ? ["Low target altitude: high airmass risk."] : []),
      ...score.warnings
    ];

    return {
      localDateTime: localDateTimeLabel(sample.instant, settings.timeZone),
      utcDateTime: sample.instant.toString(),
      nightLabel: label,
      intervalIndex: index,
      sunAltitudeDeg: sample.sun.geometricAltitudeDeg,
      sunAzimuthDeg: sample.sun.azimuthDeg,
      twilightClass: twilightClassForSunAltitude(sample.sun.geometricAltitudeDeg),
      sunScore,
      moonAltitudeDeg: sample.moon.geometricAltitudeDeg,
      moonAzimuthDeg: sample.moon.azimuthDeg,
      moonIlluminationPercent: sample.moon.illuminationPercent ?? 0,
      moonAboveHorizon: sample.moon.geometricAltitudeDeg > 0,
      angularSeparationMoonTargetDeg: sample.moonDistance,
      moonScore: moonScore.score,
      moonPenaltyReason: moonScore.reason,
      moonState: moonScore.state,
      targetAltitudeDeg: sample.target.altitudeDeg,
      targetAzimuthDeg: sample.target.azimuthDeg,
      targetAirmassApprox: airmassApprox(sample.target.altitudeDeg),
      targetVisible: sample.target.altitudeDeg > 0,
      targetAboveUsableAltitude: sample.target.altitudeDeg >= profile.minUsableAltitudeDeg,
      targetAboveMainAltitude: sample.target.altitudeDeg >= profile.minMainAltitudeDeg,
      targetAltitudeScore: altitudeScore,
      targetCulminationTime,
      targetMaxAltitudeThisNight: targetMaxAltitude,
      targetRisingOrSetting: intervalTargetTrend(sample.target.hourAngleDeg),
      targetHourAngle: sample.target.hourAngleDeg,
      finalDsoScore: score.finalDsoScore,
      category: score.category,
      effectiveWeight: score.effectiveWeight,
      reasons: unique(reasons),
      warnings: unique(warnings)
    };
  });

  const windows = groupDsoWindows(intervals, settings.intervalMinutes, object.id, object.primaryName, settings.timeZone);
  const bestWindow = [...windows]
    .filter((window) => window.category === "MAIN" || window.category === "EXTRA")
    .sort((a, b) => b.averageScore - a.averageScore || b.durationMinutes - a.durationMinutes)[0] ?? null;
  const mainDuration = categoryMinutes(intervals, "MAIN", settings.intervalMinutes);
  const extraDuration = categoryMinutes(intervals, "EXTRA", settings.intervalMinutes);
  const testDuration = categoryMinutes(intervals, "TEST", settings.intervalMinutes);
  const badDuration = categoryMinutes(intervals, "BAD", settings.intervalMinutes);
  const effectiveDuration = intervals.reduce((total, interval) => total + interval.effectiveWeight * settings.intervalMinutes, 0);
  const bestAverageScore = bestWindow?.averageScore ?? Math.max(0, ...intervals.map((interval) => interval.finalDsoScore));

  return {
    nightLabel: label,
    dateStart: date,
    dateEnd: Temporal.PlainDate.from(date).add({ days: 1 }).toString(),
    selectedObject: object,
    locationName: settings.locationName,
    setupProfileName: settings.setupProfile.name,
    intervalMinutes: settings.intervalMinutes,
    astronomicalNightStart: firstLocalTimeWhere(intervals, (interval) => interval.sunAltitudeDeg <= -18),
    astronomicalNightEnd: lastLocalTimeWhere(intervals, (interval) => interval.sunAltitudeDeg <= -18, settings.intervalMinutes, settings.timeZone),
    targetFirstAboveHorizon: firstLocalTimeWhere(intervals, (interval) => interval.targetVisible),
    targetLastAboveHorizon: lastLocalTimeWhere(intervals, (interval) => interval.targetVisible, settings.intervalMinutes, settings.timeZone),
    targetCulminationTime,
    targetMaxAltitudeDeg: targetMaxAltitude,
    timeAbove20: minutesAbove(intervals, 20, settings.intervalMinutes),
    timeAbove25: minutesAbove(intervals, 25, settings.intervalMinutes),
    timeAbove30: minutesAbove(intervals, 30, settings.intervalMinutes),
    timeAbove35: minutesAbove(intervals, 35, settings.intervalMinutes),
    timeAbove40: minutesAbove(intervals, 40, settings.intervalMinutes),
    timeAbove45: minutesAbove(intervals, 45, settings.intervalMinutes),
    timeAbove60: minutesAbove(intervals, 60, settings.intervalMinutes),
    bestWindowStart: bestWindow?.startLocal ?? null,
    bestWindowEnd: bestWindow?.endLocal ?? null,
    mainDuration,
    extraDuration,
    testDuration,
    badDuration,
    effectiveDuration,
    bestAverageScore,
    overallNightRating: rateNight(mainDuration, effectiveDuration, bestAverageScore),
    mainReasons: unique(intervals.flatMap((interval) => interval.reasons)),
    mainWarnings: unique([
      ...(intervals.every((interval) => interval.sunAltitudeDeg > -18) ? ["No astronomical night interval in the sampled range."] : []),
      ...(intervals.every((interval) => !interval.targetAboveUsableAltitude) ? ["Target never reaches usable altitude this night."] : []),
      ...intervals.flatMap((interval) => interval.warnings)
    ]),
    intervals,
    windows
  };
}

export function generateDsoPlan(settings: DsoPlannerSettings): DsoPlan {
  const object = getMessierObject(settings.objectId);
  if (!object) {
    throw new Error(`Unknown Messier object: ${settings.objectId}`);
  }

  const calendar = enumerateNightStartDates(settings.startDate, settings.endDate).map((date) => {
    const inclusion = shouldIncludeNight(date, settings.weekendOnly, settings.exceptions);
    return {
      date,
      nightLabel: dsoNightLabel(date),
      status: inclusion.status,
      reason: inclusion.reason
    };
  });
  const selectedDates = calendar.filter((entry) => entry.status !== "excluded").map((entry) => entry.date);
  const nights = selectedDates.map((date) => calculateNight(date, settings, object));
  const allWindows = nights.flatMap((night) => night.windows);
  const recommendedWindows = allWindows
    .filter((window) => window.category === "MAIN" || window.category === "EXTRA")
    .sort((a, b) => b.averageScore - a.averageScore || b.effectiveDurationMinutes - a.effectiveDurationMinutes);
  const targetHoursPlan = settings.mode === "targetHours" && settings.targetEffectiveHours
    ? planTargetEffectiveIntegration(allWindows, settings.targetEffectiveHours)
    : null;
  const targetWindowKeys = new Set(targetHoursPlan?.selectedWindows.map((window) => `${window.nightLabel}-${window.startUtc}-${window.endUtc}`) ?? []);

  for (const night of nights) {
    for (const window of night.windows) {
      window.selectedForTarget = targetWindowKeys.has(`${window.nightLabel}-${window.startUtc}-${window.endUtc}`);
    }
  }

  return {
    generatedAtUtc: Temporal.Now.instant().toString(),
    settings,
    object,
    nights,
    recommendedWindows,
    targetHoursPlan,
    totals: {
      mainMinutes: nights.reduce((total, night) => total + night.mainDuration, 0),
      extraMinutes: nights.reduce((total, night) => total + night.extraDuration, 0),
      testMinutes: nights.reduce((total, night) => total + night.testDuration, 0),
      effectiveMinutes: nights.reduce((total, night) => total + night.effectiveDuration, 0)
    },
    calendar,
    warnings: unique(nights.flatMap((night) => night.mainWarnings))
  };
}
