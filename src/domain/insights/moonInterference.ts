import type { ResultRow } from "../types";

export type MoonInterferenceLevel = "none" | "low" | "medium" | "high";

export interface MoonInterferenceSummary {
  value: number;
  level: MoonInterferenceLevel;
  note: "below_horizon" | "low_bright_moon" | "high_bright_moon" | "no_target_distance";
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateMoonInterference(moon: ResultRow | null | undefined): MoonInterferenceSummary {
  if (!moon || moon.apparentAltitudeDeg <= 0) {
    return { value: 0, level: "none", note: "below_horizon" };
  }

  const illumination = moon.illuminationPercent ?? 0;
  const altitudeFactor = clamp(moon.apparentAltitudeDeg / 60, 0, 1);
  const value = Math.round(clamp(illumination * 0.65 + altitudeFactor * 35));
  const level: MoonInterferenceLevel = value >= 68 ? "high" : value >= 35 ? "medium" : "low";

  return {
    value,
    level,
    note: level === "high" ? "high_bright_moon" : level === "medium" ? "low_bright_moon" : "no_target_distance"
  };
}
