import { Temporal } from "@js-temporal/polyfill";

export type SolarDarknessClass =
  | "daylight"
  | "civil_twilight"
  | "nautical_twilight"
  | "astronomical_twilight"
  | "astronomical_night";

export type ImagingUsefulness =
  | "not_useful"
  | "limited"
  | "usable_for_bright_targets"
  | "good"
  | "excellent";

export type ImagingMode = "strict" | "balanced" | "bright";

export interface SolarNightSample {
  utcTime: string;
  localDate: string;
  localTime: string;
  sunAltitudeDeg: number | null;
  moonAltitudeDeg?: number | null;
  moonIlluminationPercent?: number | null;
  moonInterference?: number | null;
}

export interface TimeWindow {
  startUtc: string;
  endUtc: string;
  startLocal: string;
  endLocal: string;
  durationMinutes: number;
}

export interface TwilightSegment extends TimeWindow {
  darknessClass: SolarDarknessClass;
}

export interface SolarTwilightMilestones {
  sunset: string | null;
  civilDuskEnd: string | null;
  nauticalDuskEnd: string | null;
  astronomicalNightStart: string | null;
  astronomicalNightEnd: string | null;
  nauticalDawnStart: string | null;
  civilDawnStart: string | null;
  sunrise: string | null;
}

export interface EffectiveImagingWindow extends TimeWindow {
  mode: ImagingMode;
  thresholdDeg: number;
  usefulness: ImagingUsefulness;
}

export interface NightSummary {
  nightStartDate: string;
  nightEndDate: string;
  nightLabel: string;
  samples: SolarNightSample[];
  segments: TwilightSegment[];
  milestones: SolarTwilightMilestones;
  totalNightMinutes: number;
  civilDarkMinutes: number;
  nauticalDarkMinutes: number;
  astronomicalNightMinutes: number;
  usableTwilightMinutes: number;
  effectiveWindow: EffectiveImagingWindow | null;
  strictWindow: EffectiveImagingWindow | null;
  balancedWindow: EffectiveImagingWindow | null;
  brightTargetWindow: EffectiveImagingWindow | null;
  quality: "excellent" | "good" | "usable" | "limited" | "poor";
  warning:
    | "short_astronomical_night"
    | "no_astronomical_night"
    | "no_dso_time"
    | null;
}

const modeThresholds: Record<ImagingMode, number> = {
  strict: -18,
  balanced: -15,
  bright: -12
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function minutesBetween(startUtc: string, endUtc: string): number {
  const start = Temporal.Instant.from(startUtc);
  const end = Temporal.Instant.from(endUtc);
  return Math.max(0, Math.round(Number(end.epochMilliseconds - start.epochMilliseconds) / 60000));
}

function addInterpolatedInstant(startUtc: string, endUtc: string, percent: number): string {
  const start = Temporal.Instant.from(startUtc);
  const end = Temporal.Instant.from(endUtc);
  const durationMs = Number(end.epochMilliseconds - start.epochMilliseconds);
  return Temporal.Instant.fromEpochMilliseconds(Math.round(Number(start.epochMilliseconds) + durationMs * clamp(percent, 0, 1))).toString();
}

function localTime(utcTime: string, timeZone: string): string {
  return Temporal.Instant.from(utcTime)
    .toZonedDateTimeISO(timeZone)
    .toPlainTime()
    .toString({ smallestUnit: "minute" });
}

function nextDate(localDate: string): string {
  return Temporal.PlainDate.from(localDate).add({ days: 1 }).toString();
}

function previousDate(localDate: string): string {
  return Temporal.PlainDate.from(localDate).subtract({ days: 1 }).toString();
}

function nightStartDateForSample(sample: SolarNightSample): string {
  const hour = Number(sample.localTime.slice(0, 2));
  return hour < 12 ? previousDate(sample.localDate) : sample.localDate;
}

function formatNightLabel(startDate: string, endDate: string): string {
  const start = Temporal.PlainDate.from(startDate);
  const end = Temporal.PlainDate.from(endDate);
  const startLabel = `${String(start.day).padStart(2, "0")}.${String(start.month).padStart(2, "0")}.${start.year}`;
  const endLabel = `${String(end.day).padStart(2, "0")}.${String(end.month).padStart(2, "0")}.${end.year}`;
  return `${startLabel} -> ${endLabel}`;
}

function sumWindows(windows: TimeWindow[]): number {
  return windows.reduce((total, window) => total + window.durationMinutes, 0);
}

function longestWindow(windows: TimeWindow[]): TimeWindow | null {
  return [...windows].sort((a, b) => b.durationMinutes - a.durationMinutes)[0] ?? null;
}

function crossingBetween(
  before: SolarNightSample,
  after: SolarNightSample,
  thresholdDeg: number,
  direction: "down" | "up"
): string | null {
  if (before.sunAltitudeDeg === null || after.sunAltitudeDeg === null) return null;
  const startsAbove = before.sunAltitudeDeg > thresholdDeg;
  const endsBelow = after.sunAltitudeDeg <= thresholdDeg;
  const startsBelow = before.sunAltitudeDeg <= thresholdDeg;
  const endsAbove = after.sunAltitudeDeg > thresholdDeg;

  if (direction === "down" && !(startsAbove && endsBelow)) return null;
  if (direction === "up" && !(startsBelow && endsAbove)) return null;
  if (before.sunAltitudeDeg === after.sunAltitudeDeg) return after.utcTime;

  const percent = (thresholdDeg - before.sunAltitudeDeg) / (after.sunAltitudeDeg - before.sunAltitudeDeg);
  return addInterpolatedInstant(before.utcTime, after.utcTime, percent);
}

function findCrossing(
  samples: SolarNightSample[],
  thresholdDeg: number,
  direction: "down" | "up",
  timeZone: string
): string | null {
  for (let index = 0; index < samples.length - 1; index += 1) {
    const crossing = crossingBetween(samples[index], samples[index + 1], thresholdDeg, direction);
    if (crossing) return localTime(crossing, timeZone);
  }
  return null;
}

function thresholdWindows(samples: SolarNightSample[], thresholdDeg: number, timeZone: string): TimeWindow[] {
  const windows: TimeWindow[] = [];
  let currentStart: string | null = null;

  for (let index = 0; index < samples.length - 1; index += 1) {
    const current = samples[index];
    const next = samples[index + 1];
    if (current.sunAltitudeDeg === null || next.sunAltitudeDeg === null) continue;

    const currentInside = current.sunAltitudeDeg <= thresholdDeg;
    const nextInside = next.sunAltitudeDeg <= thresholdDeg;
    const crossingDown = crossingBetween(current, next, thresholdDeg, "down");
    const crossingUp = crossingBetween(current, next, thresholdDeg, "up");

    if (!currentStart && currentInside) {
      currentStart = current.utcTime;
    }
    if (!currentStart && crossingDown) {
      currentStart = crossingDown;
    }
    if (currentStart && crossingUp) {
      windows.push({
        startUtc: currentStart,
        endUtc: crossingUp,
        startLocal: localTime(currentStart, timeZone),
        endLocal: localTime(crossingUp, timeZone),
        durationMinutes: minutesBetween(currentStart, crossingUp)
      });
      currentStart = null;
    }
    if (currentStart && index === samples.length - 2 && nextInside) {
      windows.push({
        startUtc: currentStart,
        endUtc: next.utcTime,
        startLocal: localTime(currentStart, timeZone),
        endLocal: localTime(next.utcTime, timeZone),
        durationMinutes: minutesBetween(currentStart, next.utcTime)
      });
    }
  }

  return windows.filter((window) => window.durationMinutes > 0);
}

function segmentClassForAltitude(altitude: number | null): SolarDarknessClass {
  if (altitude === null) return "daylight";
  if (altitude > 0) return "daylight";
  if (altitude > -6) return "civil_twilight";
  if (altitude > -12) return "nautical_twilight";
  if (altitude > -18) return "astronomical_twilight";
  return "astronomical_night";
}

export function classifySolarAltitudeForImaging(altitudeDeg: number | null): {
  darknessClass: SolarDarknessClass;
  usefulness: ImagingUsefulness;
} {
  if (altitudeDeg === null || altitudeDeg > -6) {
    return { darknessClass: segmentClassForAltitude(altitudeDeg), usefulness: "not_useful" };
  }
  if (altitudeDeg > -12) {
    return { darknessClass: "civil_twilight", usefulness: "limited" };
  }
  if (altitudeDeg > -15) {
    return { darknessClass: "nautical_twilight", usefulness: "usable_for_bright_targets" };
  }
  if (altitudeDeg > -18) {
    return { darknessClass: "astronomical_twilight", usefulness: "good" };
  }
  return { darknessClass: "astronomical_night", usefulness: "excellent" };
}

export function calculateSolarTwilightPhases(samples: SolarNightSample[], timeZone: string): TwilightSegment[] {
  const segments: TwilightSegment[] = [];

  for (let index = 0; index < samples.length - 1; index += 1) {
    const current = samples[index];
    const next = samples[index + 1];
    const midpointAltitude =
      current.sunAltitudeDeg !== null && next.sunAltitudeDeg !== null
        ? (current.sunAltitudeDeg + next.sunAltitudeDeg) / 2
        : current.sunAltitudeDeg ?? next.sunAltitudeDeg ?? null;
    const darknessClass = segmentClassForAltitude(midpointAltitude);
    const previous = segments[segments.length - 1];

    if (previous?.darknessClass === darknessClass) {
      previous.endUtc = next.utcTime;
      previous.endLocal = localTime(next.utcTime, timeZone);
      previous.durationMinutes = minutesBetween(previous.startUtc, next.utcTime);
    } else {
      segments.push({
        darknessClass,
        startUtc: current.utcTime,
        endUtc: next.utcTime,
        startLocal: localTime(current.utcTime, timeZone),
        endLocal: localTime(next.utcTime, timeZone),
        durationMinutes: minutesBetween(current.utcTime, next.utcTime)
      });
    }
  }

  return segments;
}

export function calculateEffectiveImagingWindow(
  samples: SolarNightSample[],
  timeZone: string,
  mode: ImagingMode = "strict"
): EffectiveImagingWindow | null {
  const thresholdDeg = modeThresholds[mode];
  const window = longestWindow(thresholdWindows(samples, thresholdDeg, timeZone));
  if (!window) return null;

  return {
    ...window,
    mode,
    thresholdDeg,
    usefulness: mode === "strict" ? "excellent" : mode === "balanced" ? "good" : "usable_for_bright_targets"
  };
}

export function calculateNightSummary(
  samples: SolarNightSample[],
  timeZone: string,
  mode: ImagingMode = "strict",
  startDateOverride?: string
): NightSummary | null {
  const sorted = [...samples]
    .filter((sample) => sample.sunAltitudeDeg !== null)
    .sort((a, b) => a.utcTime.localeCompare(b.utcTime));
  if (sorted.length < 2) return null;

  const nightStartDate = startDateOverride ?? nightStartDateForSample(sorted[0]);
  const nightEndDate = nextDate(nightStartDate);
  const nightSamples = sorted.filter((sample) => nightStartDateForSample(sample) === nightStartDate);
  const source = nightSamples.length >= 2 ? nightSamples : sorted;

  const nightWindows = thresholdWindows(source, 0, timeZone);
  const civilWindows = thresholdWindows(source, -6, timeZone);
  const nauticalWindows = thresholdWindows(source, -12, timeZone);
  const astronomicalWindows = thresholdWindows(source, -18, timeZone);
  const strictWindow = calculateEffectiveImagingWindow(source, timeZone, "strict");
  const balancedWindow = calculateEffectiveImagingWindow(source, timeZone, "balanced");
  const brightTargetWindow = calculateEffectiveImagingWindow(source, timeZone, "bright");
  const effectiveWindow = calculateEffectiveImagingWindow(source, timeZone, mode);
  const astronomicalNightMinutes = sumWindows(astronomicalWindows);
  const usableTwilightMinutes = Math.max(0, sumWindows(thresholdWindows(source, -15, timeZone)) - astronomicalNightMinutes);

  let quality: NightSummary["quality"] = "poor";
  if (astronomicalNightMinutes >= 180) quality = "excellent";
  else if (astronomicalNightMinutes >= 90) quality = "good";
  else if (sumWindows(thresholdWindows(source, -15, timeZone)) >= 90) quality = "usable";
  else if (sumWindows(nauticalWindows) >= 60) quality = "limited";

  const warning: NightSummary["warning"] =
    astronomicalNightMinutes === 0
      ? sumWindows(nauticalWindows) === 0
        ? "no_dso_time"
        : "no_astronomical_night"
      : astronomicalNightMinutes < 90
        ? "short_astronomical_night"
        : null;

  return {
    nightStartDate,
    nightEndDate,
    nightLabel: formatNightLabel(nightStartDate, nightEndDate),
    samples: source,
    segments: calculateSolarTwilightPhases(source, timeZone),
    milestones: {
      sunset: findCrossing(source, 0, "down", timeZone),
      civilDuskEnd: findCrossing(source, -6, "down", timeZone),
      nauticalDuskEnd: findCrossing(source, -12, "down", timeZone),
      astronomicalNightStart: findCrossing(source, -18, "down", timeZone),
      astronomicalNightEnd: findCrossing(source, -18, "up", timeZone),
      nauticalDawnStart: findCrossing(source, -12, "up", timeZone),
      civilDawnStart: findCrossing(source, -6, "up", timeZone),
      sunrise: findCrossing(source, 0, "up", timeZone)
    },
    totalNightMinutes: sumWindows(nightWindows),
    civilDarkMinutes: sumWindows(civilWindows),
    nauticalDarkMinutes: sumWindows(nauticalWindows),
    astronomicalNightMinutes,
    usableTwilightMinutes,
    effectiveWindow,
    strictWindow,
    balancedWindow,
    brightTargetWindow,
    quality,
    warning
  };
}

export function calculateMultiNightSummaries(
  samples: SolarNightSample[],
  timeZone: string,
  mode: ImagingMode = "strict"
): NightSummary[] {
  const groups = new Map<string, SolarNightSample[]>();
  for (const sample of samples) {
    const key = nightStartDateForSample(sample);
    groups.set(key, [...(groups.get(key) ?? []), sample]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([nightStartDate, group]) => calculateNightSummary(group, timeZone, mode, nightStartDate))
    .filter((summary): summary is NightSummary => Boolean(summary));
}

export function imagingModeThreshold(mode: ImagingMode): number {
  return modeThresholds[mode];
}
