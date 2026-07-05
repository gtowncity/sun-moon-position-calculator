import type { EventResult, ResultRow } from "../types";
import {
  calculateMultiNightSummaries,
  calculateNightSummary,
  type ImagingMode,
  type NightSummary,
  type SolarNightSample
} from "../domain/insights/effectiveImagingWindow";
import { calculateMoonInterference } from "../domain/insights/moonInterference";

export type ObservationQuality = "excellent" | "good" | "mixed" | "poor";

export interface TimeSample {
  utcTime: string;
  localDate: string;
  localTime: string;
  sun: ResultRow | null;
  moon: ResultRow | null;
  darknessScore: number;
  moonInterference: number;
  usabilityScore: number;
  quality: ObservationQuality;
}

export interface ObservationWindow {
  startLocal: string;
  endLocal: string;
  startUtc: string;
  endUtc: string;
  durationMinutes: number;
  score: number;
}

export interface DayInsight {
  localDate: string;
  score: number;
  quality: ObservationQuality;
  bestWindow: ObservationWindow | null;
  sampleCount: number;
}

export interface DashboardInsight {
  samples: TimeSample[];
  bestWindow: ObservationWindow | null;
  nightSummary: NightSummary | null;
  multiNightSummaries: NightSummary[];
  imagingMode: ImagingMode;
  darknessScore: number;
  moonInterference: number;
  usabilityScore: number;
  quality: ObservationQuality;
  reasonKeys: Array<"sunDeepEnough" | "sunTooHigh" | "moonLow" | "moonBright" | "shortWindow">;
  dayInsights: DayInsight[];
}

export interface DashboardInsightOptions {
  imagingMode?: ImagingMode;
  nightStartDate?: string;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function minutesFromLocalTime(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function minutesBetween(startUtc: string, endUtc: string): number {
  const diff = new Date(endUtc).getTime() - new Date(startUtc).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

function qualityFromScore(score: number): ObservationQuality {
  if (score >= 82) return "excellent";
  if (score >= 65) return "good";
  if (score >= 42) return "mixed";
  return "poor";
}

function scoreDarkness(sun: ResultRow | null): number {
  if (!sun) return 0;
  const altitude = sun.geometricAltitudeDeg;
  if (altitude <= -18) return 100;
  if (altitude <= -12) return 76 + (-12 - altitude) * 4;
  if (altitude <= -6) return 45 + (-6 - altitude) * 5;
  if (altitude <= 0) return 20 + (0 - altitude) * 4;
  return 5;
}

function scoreMoonInterference(moon: ResultRow | null): number {
  return calculateMoonInterference(moon).value;
}

function groupSamples(rows: ResultRow[]): TimeSample[] {
  const grouped = new Map<string, { sun: ResultRow | null; moon: ResultRow | null }>();

  for (const row of rows) {
    const current = grouped.get(row.utcTime) ?? { sun: null, moon: null };
    current[row.body] = row;
    grouped.set(row.utcTime, current);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([utcTime, bodies]) => {
      const reference = bodies.sun ?? bodies.moon;
      const darknessScore = scoreDarkness(bodies.sun);
      const moonInterference = scoreMoonInterference(bodies.moon);
      const usabilityScore = clamp(darknessScore - moonInterference * 0.72);

      return {
        utcTime,
        localDate: reference?.localDate ?? "",
        localTime: reference?.localTime ?? "",
        sun: bodies.sun,
        moon: bodies.moon,
        darknessScore,
        moonInterference,
        usabilityScore,
        quality: qualityFromScore(usabilityScore)
      };
    });
}

function bestWindowForSamples(samples: TimeSample[]): ObservationWindow | null {
  const usable = samples.filter((sample) => sample.usabilityScore >= 55);
  if (usable.length === 0) return null;

  const runs: TimeSample[][] = [];
  let current: TimeSample[] = [];

  for (const sample of samples) {
    if (sample.usabilityScore >= 55) {
      current.push(sample);
    } else if (current.length > 0) {
      runs.push(current);
      current = [];
    }
  }

  if (current.length > 0) runs.push(current);

  const ranked = runs
    .map((run) => ({
      run,
      score: average(run.map((sample) => sample.usabilityScore)),
      duration: minutesBetween(run[0].utcTime, run[run.length - 1].utcTime)
    }))
    .sort((a, b) => b.score * 10 + b.duration - (a.score * 10 + a.duration));

  const best = ranked[0];
  if (!best) return null;

  const first = best.run[0];
  const last = best.run[best.run.length - 1];
  return {
    startLocal: first.localTime.slice(0, 5),
    endLocal: last.localTime.slice(0, 5),
    startUtc: first.utcTime,
    endUtc: last.utcTime,
    durationMinutes: best.duration,
    score: Math.round(best.score)
  };
}

function dayInsights(samples: TimeSample[]): DayInsight[] {
  const grouped = new Map<string, TimeSample[]>();

  for (const sample of samples) {
    grouped.set(sample.localDate, [...(grouped.get(sample.localDate) ?? []), sample]);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([localDate, daySamples]) => {
      const score = Math.round(average(daySamples.map((sample) => sample.usabilityScore)));
      return {
        localDate,
        score,
        quality: qualityFromScore(score),
        bestWindow: bestWindowForSamples(daySamples),
        sampleCount: daySamples.length
      };
    });
}

function reasonKeys(insight: Pick<DashboardInsight, "bestWindow" | "darknessScore" | "moonInterference" | "usabilityScore">): DashboardInsight["reasonKeys"] {
  const reasons: DashboardInsight["reasonKeys"] = [];

  reasons.push(insight.darknessScore >= 70 ? "sunDeepEnough" : "sunTooHigh");
  reasons.push(insight.moonInterference <= 32 ? "moonLow" : "moonBright");
  if (!insight.bestWindow || insight.bestWindow.durationMinutes < 90) {
    reasons.push("shortWindow");
  }

  return reasons;
}

function toSolarNightSamples(samples: TimeSample[]): SolarNightSample[] {
  return samples.map((sample) => ({
    utcTime: sample.utcTime,
    localDate: sample.localDate,
    localTime: sample.localTime,
    sunAltitudeDeg: sample.sun?.geometricAltitudeDeg ?? null,
    moonAltitudeDeg: sample.moon?.apparentAltitudeDeg ?? null,
    moonIlluminationPercent: sample.moon?.illuminationPercent ?? null,
    moonInterference: sample.moonInterference
  }));
}

function sampleTimeZone(samples: TimeSample[]): string {
  const first = samples.find((sample) => sample.sun?.timeZone || sample.moon?.timeZone);
  return first?.sun?.timeZone ?? first?.moon?.timeZone ?? "UTC";
}

export function createDashboardInsight(rows: ResultRow[], options: DashboardInsightOptions = {}): DashboardInsight {
  const samples = groupSamples(rows);
  const imagingMode = options.imagingMode ?? "strict";
  const solarNightSamples = toSolarNightSamples(samples);
  const timeZone = sampleTimeZone(samples);
  const multiNightSummaries = calculateMultiNightSummaries(solarNightSamples, timeZone, imagingMode);
  const selectedNightSummary = options.nightStartDate
    ? calculateNightSummary(solarNightSamples, timeZone, imagingMode, options.nightStartDate)
    : null;
  const nightSummary = selectedNightSummary ?? multiNightSummaries[0] ?? null;
  const bestWindow = bestWindowForSamples(samples);
  const darknessScore = Math.round(average(samples.map((sample) => sample.darknessScore)));
  const moonInterference = Math.round(average(samples.map((sample) => sample.moonInterference)));
  const usabilityScore = Math.round(average(samples.map((sample) => sample.usabilityScore)));
  const insightBase = { bestWindow, darknessScore, moonInterference, usabilityScore };

  return {
    samples,
    bestWindow,
    nightSummary,
    multiNightSummaries,
    imagingMode,
    darknessScore,
    moonInterference,
    usabilityScore,
    quality: qualityFromScore(usabilityScore),
    reasonKeys: reasonKeys(insightBase),
    dayInsights: dayInsights(samples)
  };
}

export function findSample(samples: TimeSample[], utcTime: string | null): TimeSample | null {
  if (!utcTime) return samples[0] ?? null;
  return samples.find((sample) => sample.utcTime === utcTime) ?? samples[0] ?? null;
}

export function nearestSampleByPercent(samples: TimeSample[], percent: number): TimeSample | null {
  if (samples.length === 0) return null;
  const index = Math.round(clamp(percent, 0, 1) * (samples.length - 1));
  return samples[index] ?? null;
}

export function eventMatchesSample(event: EventResult, sample: TimeSample): boolean {
  if (!event.utcTime) return false;
  const eventMinutes = new Date(event.utcTime).getTime() / 60000;
  const sampleMinutes = new Date(sample.utcTime).getTime() / 60000;
  return Math.abs(eventMinutes - sampleMinutes) <= 45;
}

export function isNightSample(sample: TimeSample): boolean {
  const minutes = minutesFromLocalTime(sample.localTime);
  return minutes >= 18 * 60 || minutes <= 6 * 60;
}
