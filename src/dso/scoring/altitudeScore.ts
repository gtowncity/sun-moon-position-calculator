import type { PlanningProfile } from "../types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function interpolate(value: number, lowValue: number, highValue: number, lowScore: number, highScore: number): number {
  if (highValue === lowValue) return highScore;
  const ratio = (value - lowValue) / (highValue - lowValue);
  return lowScore + (highScore - lowScore) * ratio;
}

export function calculateAltitudeScore(altitudeDeg: number, profile: PlanningProfile): number {
  const usable = profile.minUsableAltitudeDeg;
  const main = profile.minMainAltitudeDeg;
  const ideal = profile.idealAltitudeDeg;

  if (!Number.isFinite(altitudeDeg) || altitudeDeg < usable - 5) return 0;
  if (altitudeDeg < usable) return Math.round(clamp(interpolate(altitudeDeg, usable - 5, usable, 20, 35)));
  if (altitudeDeg < main) return Math.round(clamp(interpolate(altitudeDeg, usable, main, 35, 60)));
  if (altitudeDeg < ideal) return Math.round(clamp(interpolate(altitudeDeg, main, ideal, 70, 92)));
  if (altitudeDeg < 60) return Math.round(clamp(interpolate(altitudeDeg, ideal, 60, 92, 100)));
  return 100;
}
