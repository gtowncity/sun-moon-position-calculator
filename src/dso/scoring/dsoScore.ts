import type {
  DeepSkyObject,
  DsoCategory,
  DsoInterval,
  DsoSetupProfile,
  PlanningProfile,
  QualityProfile
} from "../types";
import { setupMoonTwilightSensitivityMultiplier } from "../catalog/objectProfiles";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function categoryFromScore(score: number, quality: QualityProfile): DsoCategory {
  if (score >= quality.mainScoreThreshold) return "MAIN";
  if (score >= quality.extraScoreThreshold) return "EXTRA";
  if (score >= quality.testScoreThreshold) return "TEST";
  return "BAD";
}

function limitCategory(category: DsoCategory, maxCategory: DsoCategory): DsoCategory {
  const rank: Record<DsoCategory, number> = { BAD: 0, TEST: 1, EXTRA: 2, MAIN: 3 };
  const categories: DsoCategory[] = ["BAD", "TEST", "EXTRA", "MAIN"];
  return categories[Math.min(rank[category], rank[maxCategory])];
}

export function effectiveWeightForScore(score: number, category: DsoCategory): number {
  if (category === "BAD" || score < 40) return 0;
  if (score >= 90) return 1;
  if (score >= 80) return 0.85 + (score - 80) * 0.01;
  if (score >= 60) return 0.5 + (score - 60) * 0.015;
  return 0.15 + (score - 40) * 0.0125;
}

function objectDifficultyModifier(profile: PlanningProfile): number {
  if (profile.broadbandDifficulty === "extreme") return 0.9;
  if (profile.broadbandDifficulty === "hard") return 0.95;
  if (profile.broadbandDifficulty === "easy") return 1.04;
  return 1;
}

function skyModifier(bortle?: number, sqm?: number): number {
  let modifier = 1;
  if (typeof bortle === "number" && Number.isFinite(bortle)) {
    modifier += (4.5 - bortle) * 0.018;
  }
  if (typeof sqm === "number" && Number.isFinite(sqm)) {
    modifier += (sqm - 21.0) * 0.025;
  }
  return Math.max(0.9, Math.min(1.08, modifier));
}

function setupModifier(profile: PlanningProfile, setup: DsoSetupProfile): number {
  const moonMultiplier = setupMoonTwilightSensitivityMultiplier(setup);
  const broadbandPenalty = moonMultiplier > 1 ? (profile.faintDetailSensitivity * 0.025) : 0;
  const guidingBonus = setup.guidingEnabled ? 0.01 : 0;
  return Math.max(0.94, Math.min(1.04, 1 - broadbandPenalty + guidingBonus));
}

export interface DsoScoreInput {
  object: DeepSkyObject;
  sunAltitudeDeg: number;
  sunScore: number;
  moonScore: number;
  moonIlluminationPercent: number;
  moonAltitudeDeg: number;
  moonDistanceDeg: number;
  targetAltitudeDeg: number;
  targetAltitudeScore: number;
  qualityProfile: QualityProfile;
  setupProfile: DsoSetupProfile;
  bortle?: number;
  sqm?: number;
}

export function calculateFinalDsoScore(input: DsoScoreInput): Pick<DsoInterval, "finalDsoScore" | "category" | "effectiveWeight" | "reasons" | "warnings"> {
  const profile = input.object.planningProfile;
  const setup = input.setupProfile;
  const factors = [
    { score: input.sunScore / 100, weight: 0.95 + profile.twilightSensitivity * 0.55 },
    { score: input.moonScore / 100, weight: 0.85 + profile.moonSensitivity * 0.7 },
    { score: input.targetAltitudeScore / 100, weight: 1.0 + profile.altitudeSensitivity * 0.55 }
  ];
  const weightSum = factors.reduce((total, factor) => total + factor.weight, 0);
  const geometric = Math.exp(
    factors.reduce((total, factor) => total + Math.log(Math.max(0.01, factor.score)) * factor.weight, 0) / weightSum
  );
  const softMinimum = Math.min(...factors.map((factor) => factor.score));
  let score = 100 * (geometric * 0.68 + softMinimum * 0.32);
  score *= objectDifficultyModifier(profile);
  score *= skyModifier(input.bortle, input.sqm);
  score *= setupModifier(profile, setup);
  score = Math.round(clamp(score));

  let category = categoryFromScore(score, input.qualityProfile);
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (input.targetAltitudeDeg < profile.minUsableAltitudeDeg) {
    category = limitCategory(category, "TEST");
    warnings.push(`Target below usable altitude (${profile.minUsableAltitudeDeg} deg).`);
  }

  if (input.targetAltitudeDeg < profile.minMainAltitudeDeg) {
    category = limitCategory(category, "EXTRA");
    reasons.push(`Target altitude below MAIN threshold (${profile.minMainAltitudeDeg} deg).`);
  }

  const weakObject = profile.surfaceBrightnessClass === "low" || profile.surfaceBrightnessClass === "very_low" || profile.broadbandDifficulty === "extreme";
  if (weakObject && input.sunAltitudeDeg > -16.5) {
    category = limitCategory(category, "TEST");
    warnings.push("Weak broadband target during bright astronomical twilight: no MAIN data.");
  } else if (input.sunAltitudeDeg > input.qualityProfile.sunMainAltitudeDeg && !input.qualityProfile.allowTwilightMainForBrightObjects) {
    category = limitCategory(category, "EXTRA");
    reasons.push("Quality profile requires deeper darkness for MAIN.");
  }

  if (input.moonScore < 35 && profile.moonSensitivity >= 0.75) {
    category = limitCategory(category, "TEST");
    warnings.push("Moon score is very low for a moon-sensitive object.");
  } else if (input.moonScore < 55 && profile.moonSensitivity >= 0.75) {
    category = limitCategory(category, "EXTRA");
    reasons.push("Moon penalty limits this window to EXTRA.");
  }

  if (
    input.moonAltitudeDeg > 0 &&
    input.moonIlluminationPercent > (profile.maxRecommendedMoonIlluminationMain ?? 45) &&
    input.moonDistanceDeg < (profile.minRecommendedMoonDistanceDeg ?? 60)
  ) {
    category = limitCategory(category, profile.moonSensitivity >= 0.85 ? "TEST" : "EXTRA");
    warnings.push("Moon is bright and close enough to create likely gradients.");
  }

  if (profile.coreSaturationRisk === "high") {
    reasons.push("High core saturation risk: combine with shorter sub-exposures.");
  }

  if (profile.framingDifficulty === "hard") {
    reasons.push("Framing is demanding for this object/setup.");
  }

  if (profile.broadbandDifficulty === "extreme") {
    reasons.push(`${input.object.id} is treated as an extreme broadband target.`);
  } else if (profile.moonSensitivity <= 0.3) {
    reasons.push(`${input.object.id} is tolerant of some moonlight compared with faint galaxies.`);
  }

  return {
    finalDsoScore: score,
    category,
    effectiveWeight: effectiveWeightForScore(score, category),
    reasons,
    warnings
  };
}
