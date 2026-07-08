import type { MoonState, PlanningProfile } from "../types";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function illuminationPenalty(illuminationPercent: number): number {
  if (illuminationPercent <= 15) return illuminationPercent * 0.25;
  if (illuminationPercent <= 30) return 4 + (illuminationPercent - 15) * 0.45;
  if (illuminationPercent <= 50) return 11 + (illuminationPercent - 30) * 0.8;
  if (illuminationPercent <= 70) return 27 + (illuminationPercent - 50) * 1.05;
  if (illuminationPercent <= 90) return 48 + (illuminationPercent - 70) * 1.25;
  return 73 + (illuminationPercent - 90) * 1.7;
}

function altitudePenalty(moonAltitudeDeg: number): number {
  if (moonAltitudeDeg <= 0) return 0;
  if (moonAltitudeDeg <= 10) return moonAltitudeDeg * 0.8;
  if (moonAltitudeDeg <= 30) return 8 + (moonAltitudeDeg - 10) * 0.75;
  if (moonAltitudeDeg <= 50) return 23 + (moonAltitudeDeg - 30) * 0.9;
  return 41 + Math.min(20, (moonAltitudeDeg - 50) * 0.6);
}

function distancePenalty(separationDeg: number): number {
  if (separationDeg > 120) return 0;
  if (separationDeg > 90) return 8;
  if (separationDeg > 60) return 22;
  if (separationDeg > 40) return 42;
  if (separationDeg > 25) return 62;
  return 82;
}

export function moonStateFor(moonAltitudeDeg: number, separationDeg: number, illuminationPercent: number): MoonState {
  if (moonAltitudeDeg <= 0) return "below_horizon";
  if (illuminationPercent >= 70 && moonAltitudeDeg > 30 && separationDeg < 60) return "severe";
  if (moonAltitudeDeg > 30 && separationDeg < 60) return "high_near";
  if (moonAltitudeDeg > 30) return "high_far";
  if (separationDeg < 60) return "low_near";
  return "low_far";
}

export interface MoonScoreResult {
  score: number;
  state: MoonState;
  reason: string;
}

export function calculateMoonScore(
  moonAltitudeDeg: number,
  illuminationPercent: number,
  separationDeg: number,
  profile: PlanningProfile,
  multiplier = 1
): MoonScoreResult {
  if (moonAltitudeDeg <= 0) {
    return {
      score: 100,
      state: "below_horizon",
      reason: "Moon below horizon: no moon penalty."
    };
  }

  const rawPenalty =
    illuminationPenalty(illuminationPercent) * 0.45 +
    altitudePenalty(moonAltitudeDeg) * 0.25 +
    distancePenalty(separationDeg) * 0.3;
  const sensitivityBoost =
    0.35 +
    profile.moonSensitivity * 0.45 +
    profile.gradientSensitivity * 0.12 +
    profile.faintDetailSensitivity * 0.08;
  const penalty = rawPenalty * sensitivityBoost * multiplier;
  const score = Math.round(clamp(100 - penalty, 0, 100));
  const state = moonStateFor(moonAltitudeDeg, separationDeg, illuminationPercent);
  const reasons: string[] = [
    `Moon ${illuminationPercent.toFixed(0)}% and ${moonAltitudeDeg.toFixed(0)} deg high.`,
    `${separationDeg.toFixed(0)} deg from target.`
  ];

  if (profile.moonSensitivity >= 0.85) {
    reasons.push("Moon-sensitive object: penalty is weighted strongly.");
  } else if (profile.moonSensitivity <= 0.3) {
    reasons.push("Bright cluster-like object: moon penalty is reduced.");
  }

  return { score, state, reason: reasons.join(" ") };
}
