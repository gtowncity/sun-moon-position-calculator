import type { EventResult, ResultRow } from "../../types";
import type { TranslationKey, Translator } from "../../i18n";
import type { DashboardInsight, TimeSample } from "../../app/insights";
import { classifySolarAltitudeForImaging, type SolarDarknessClass } from "../../domain/insights/effectiveImagingWindow";

export function formatDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  if (hours <= 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatWindow(start: string | null | undefined, end: string | null | undefined, t: Translator): string {
  return start && end ? `${start}-${end}` : t("notInRange");
}

export function formatAltitude(row: ResultRow | null | undefined): string {
  if (!row) return "-";
  return `${row.apparentAltitudeDeg.toFixed(1)} deg`;
}

export function sampleLabel(sample: TimeSample | null, t: Translator): string {
  if (!sample) return t("noRows");
  return `${sample.localTime.slice(0, 5)} ${sample.localDate}`;
}

export function samplesForNight(insight: DashboardInsight): TimeSample[] {
  const summary = insight.nightSummary;
  if (!summary) return insight.samples;
  const allowed = new Set(summary.samples.map((sample) => sample.utcTime));
  return insight.samples.filter((sample) => allowed.has(sample.utcTime));
}

export function classForSample(sample: TimeSample): SolarDarknessClass {
  return classifySolarAltitudeForImaging(sample.sun?.geometricAltitudeDeg ?? null).darknessClass;
}

export function activeRecommendation(sample: TimeSample | null, t: Translator): string {
  const usefulness = classifySolarAltitudeForImaging(sample?.sun?.geometricAltitudeDeg ?? null).usefulness;
  return t(`imagingUsefulness_${usefulness}` as TranslationKey);
}

export function percentForUtc(samples: TimeSample[], utcTime: string): number {
  if (samples.length < 2) return 0;
  const first = new Date(samples[0].utcTime).getTime();
  const last = new Date(samples[samples.length - 1].utcTime).getTime();
  const value = new Date(utcTime).getTime();
  return Math.max(0, Math.min(100, ((value - first) / Math.max(1, last - first)) * 100));
}

export function eventKey(event: EventResult, index = 0): string {
  return `${event.body}-${event.kind}-${event.status}-${event.localDate ?? "no-date"}-${event.utcTime ?? "no-utc"}-${index}`;
}

export function nightQualityToken(quality: string | undefined): string {
  if (quality === "excellent") return "PERFECT";
  if (quality === "good") return "GOOD";
  if (quality === "usable") return "USABLE";
  if (quality === "limited" || quality === "mixed") return "LIMITED";
  return "WARNING";
}

export function nightQualityLabel(quality: string | undefined, t: Translator): string {
  if (quality === "excellent") return t("nightQuality_excellent");
  if (quality === "good") return t("nightQuality_good");
  if (quality === "usable") return t("nightQuality_usable");
  if (quality === "limited") return t("nightQuality_limited");
  return t("nightQuality_poor");
}
