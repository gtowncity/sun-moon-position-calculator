import type { DashboardInsight, TimeSample } from "../../app/insights";
import type { NightSummary } from "./effectiveImagingWindow";

export interface QualityDiagnostic {
  key: "darkness" | "moonImpact" | "usability" | "window";
  score: number;
  status: "excellent" | "good" | "limited" | "warning";
  valueLabel: string;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function statusFromScore(score: number): QualityDiagnostic["status"] {
  if (score >= 82) return "excellent";
  if (score >= 65) return "good";
  if (score >= 42) return "limited";
  return "warning";
}

function formatMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function moonScore(samples: TimeSample[]): number {
  if (samples.length === 0) return 100;
  const average = samples.reduce((sum, sample) => sum + sample.moonInterference, 0) / samples.length;
  return clamp(100 - average);
}

export function calculateQualityDiagnostics(insight: DashboardInsight, summary: NightSummary | null = insight.nightSummary): QualityDiagnostic[] {
  const windowMinutes = summary?.effectiveWindow?.durationMinutes ?? 0;
  const windowScore = clamp((windowMinutes / 240) * 100);
  const moon = moonScore(summary?.samples ? insight.samples.filter((sample) => summary.samples.some((nightSample) => nightSample.utcTime === sample.utcTime)) : insight.samples);

  return [
    {
      key: "darkness",
      score: clamp(insight.darknessScore),
      status: statusFromScore(insight.darknessScore),
      valueLabel: `${Math.round(clamp(insight.darknessScore))}/100`
    },
    {
      key: "moonImpact",
      score: moon,
      status: statusFromScore(moon),
      valueLabel: moon >= 68 ? "LOW" : moon >= 35 ? "MEDIUM" : "HIGH"
    },
    {
      key: "usability",
      score: clamp(insight.usabilityScore),
      status: statusFromScore(insight.usabilityScore),
      valueLabel: `${Math.round(clamp(insight.usabilityScore))}/100`
    },
    {
      key: "window",
      score: windowScore,
      status: statusFromScore(windowScore),
      valueLabel: formatMinutes(windowMinutes)
    }
  ];
}
