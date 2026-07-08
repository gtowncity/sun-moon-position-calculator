import type {
  BroadbandDifficulty,
  DeepSkyObject,
  DsoObjectType,
  DsoSetupProfile,
  PlanningProfile,
  QualityProfile,
  SurfaceBrightnessClass
} from "../types";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const defaultDsoSetupProfile: DsoSetupProfile = {
  id: "evostar-72ed-nikon-d5300-guiding",
  name: "Evostar 72ED + Nikon D5300 + Guiding",
  telescopeName: "Sky-Watcher Evostar 72ED",
  apertureMm: 72,
  focalLengthMm: 420,
  fRatio: 5.8,
  cameraName: "Nikon D5300",
  sensorType: "APS-C DSLR",
  pixelSizeMicron: 3.91,
  sensorWidthMm: 23.5,
  sensorHeightMm: 15.6,
  isMono: false,
  isCooled: false,
  filterMode: "broadband_rgb",
  guidingEnabled: true,
  mountName: "EQ5 SynScan",
  notes: ["Broadband DSLR setup; moonlight and twilight are weighted conservatively."]
};

export const fallbackDsoSetupProfile: DsoSetupProfile = {
  id: "default-broadband-dslr",
  name: "Default broadband DSLR",
  filterMode: "broadband_rgb",
  isMono: false,
  isCooled: false,
  notes: ["Generic broadband DSLR profile used when no detailed setup is available."]
};

export const qualityProfiles: QualityProfile[] = [
  {
    id: "strict",
    name: "Strict",
    description: "MAIN only under very dark, low-risk conditions.",
    mainScoreThreshold: 84,
    extraScoreThreshold: 64,
    testScoreThreshold: 42,
    sunMainAltitudeDeg: -18,
    sunExtraAltitudeDeg: -17.5,
    moonPenaltyMultiplier: 1.16,
    altitudeStrictnessOffsetDeg: 4,
    allowTwilightMainForBrightObjects: false
  },
  {
    id: "normal",
    name: "Normal",
    description: "Balanced default for broadband DSO planning.",
    mainScoreThreshold: 80,
    extraScoreThreshold: 60,
    testScoreThreshold: 40,
    sunMainAltitudeDeg: -17.8,
    sunExtraAltitudeDeg: -17.3,
    moonPenaltyMultiplier: 1,
    altitudeStrictnessOffsetDeg: 0,
    allowTwilightMainForBrightObjects: true
  },
  {
    id: "aggressive",
    name: "Aggressive",
    description: "Collect more EXTRA/TEST data, while still guarding MAIN quality.",
    mainScoreThreshold: 78,
    extraScoreThreshold: 56,
    testScoreThreshold: 36,
    sunMainAltitudeDeg: -17.6,
    sunExtraAltitudeDeg: -17,
    moonPenaltyMultiplier: 0.88,
    altitudeStrictnessOffsetDeg: -3,
    allowTwilightMainForBrightObjects: true
  }
];

export function qualityProfileById(id: string | null | undefined): QualityProfile {
  return qualityProfiles.find((profile) => profile.id === id) ?? qualityProfiles[1];
}

const baseProfile: PlanningProfile = {
  moonSensitivity: 0.55,
  twilightSensitivity: 0.55,
  altitudeSensitivity: 0.65,
  gradientSensitivity: 0.55,
  faintDetailSensitivity: 0.55,
  surfaceBrightnessClass: "medium",
  broadbandDifficulty: "moderate",
  minUsableAltitudeDeg: 25,
  minMainAltitudeDeg: 35,
  idealAltitudeDeg: 50,
  maxRecommendedMoonIlluminationMain: 45,
  maxRecommendedMoonIlluminationExtra: 65,
  minRecommendedMoonDistanceDeg: 55,
  coreSaturationRisk: "low",
  framingDifficulty: "moderate",
  recommendedUse: ["MAIN", "EXTRA", "TEST"],
  notes: []
};

export const defaultProfilesByType: Record<DsoObjectType, PlanningProfile> = {
  galaxy_spiral: {
    ...baseProfile,
    moonSensitivity: 0.8,
    twilightSensitivity: 0.8,
    altitudeSensitivity: 0.8,
    gradientSensitivity: 0.8,
    faintDetailSensitivity: 0.85,
    surfaceBrightnessClass: "low",
    broadbandDifficulty: "hard",
    minUsableAltitudeDeg: 28,
    minMainAltitudeDeg: 40,
    idealAltitudeDeg: 60,
    maxRecommendedMoonIlluminationMain: 30,
    maxRecommendedMoonIlluminationExtra: 50,
    minRecommendedMoonDistanceDeg: 75,
    coreSaturationRisk: "low",
    framingDifficulty: "moderate",
    notes: ["Broadband galaxy details benefit strongly from dark, moon-free sky."]
  },
  galaxy_elliptical: {
    ...baseProfile,
    moonSensitivity: 0.65,
    twilightSensitivity: 0.7,
    altitudeSensitivity: 0.75,
    gradientSensitivity: 0.65,
    faintDetailSensitivity: 0.65,
    surfaceBrightnessClass: "medium",
    broadbandDifficulty: "moderate",
    minUsableAltitudeDeg: 27,
    minMainAltitudeDeg: 38,
    idealAltitudeDeg: 55,
    maxRecommendedMoonIlluminationMain: 45,
    maxRecommendedMoonIlluminationExtra: 65,
    minRecommendedMoonDistanceDeg: 65,
    coreSaturationRisk: "low",
    framingDifficulty: "easy",
    notes: ["Elliptical galaxies are often less structure-sensitive than faint spiral arms."]
  },
  galaxy_irregular: {
    ...baseProfile,
    moonSensitivity: 0.7,
    twilightSensitivity: 0.72,
    altitudeSensitivity: 0.72,
    gradientSensitivity: 0.68,
    faintDetailSensitivity: 0.68,
    surfaceBrightnessClass: "medium",
    broadbandDifficulty: "moderate",
    minUsableAltitudeDeg: 27,
    minMainAltitudeDeg: 38,
    idealAltitudeDeg: 55,
    maxRecommendedMoonIlluminationMain: 42,
    maxRecommendedMoonIlluminationExtra: 62,
    minRecommendedMoonDistanceDeg: 65,
    coreSaturationRisk: "low",
    framingDifficulty: "moderate",
    notes: ["Irregular galaxies are scored between compact bright targets and faint spirals."]
  },
  globular_cluster: {
    ...baseProfile,
    moonSensitivity: 0.25,
    twilightSensitivity: 0.35,
    altitudeSensitivity: 0.65,
    gradientSensitivity: 0.25,
    faintDetailSensitivity: 0.25,
    surfaceBrightnessClass: "high",
    broadbandDifficulty: "easy",
    minUsableAltitudeDeg: 25,
    minMainAltitudeDeg: 30,
    idealAltitudeDeg: 45,
    maxRecommendedMoonIlluminationMain: 75,
    maxRecommendedMoonIlluminationExtra: 90,
    minRecommendedMoonDistanceDeg: 35,
    coreSaturationRisk: "medium",
    framingDifficulty: "easy",
    notes: ["Globular clusters tolerate moderate moonlight better; altitude and seeing matter more."]
  },
  open_cluster: {
    ...baseProfile,
    moonSensitivity: 0.2,
    twilightSensitivity: 0.3,
    altitudeSensitivity: 0.55,
    gradientSensitivity: 0.2,
    faintDetailSensitivity: 0.2,
    surfaceBrightnessClass: "high",
    broadbandDifficulty: "easy",
    minUsableAltitudeDeg: 22,
    minMainAltitudeDeg: 30,
    idealAltitudeDeg: 45,
    maxRecommendedMoonIlluminationMain: 80,
    maxRecommendedMoonIlluminationExtra: 95,
    minRecommendedMoonDistanceDeg: 30,
    coreSaturationRisk: "medium",
    framingDifficulty: "easy",
    notes: ["Open clusters are comparatively forgiving under moonlight and light twilight."]
  },
  emission_nebula: {
    ...baseProfile,
    moonSensitivity: 0.55,
    twilightSensitivity: 0.55,
    altitudeSensitivity: 0.65,
    gradientSensitivity: 0.6,
    faintDetailSensitivity: 0.6,
    surfaceBrightnessClass: "medium",
    broadbandDifficulty: "moderate",
    minUsableAltitudeDeg: 25,
    minMainAltitudeDeg: 35,
    idealAltitudeDeg: 50,
    maxRecommendedMoonIlluminationMain: 45,
    maxRecommendedMoonIlluminationExtra: 65,
    minRecommendedMoonDistanceDeg: 55,
    coreSaturationRisk: "medium",
    framingDifficulty: "moderate",
    notes: ["Bright emission nebulae can produce useful data outside the strictest dark window."]
  },
  reflection_nebula: {
    ...baseProfile,
    moonSensitivity: 0.9,
    twilightSensitivity: 0.85,
    altitudeSensitivity: 0.75,
    gradientSensitivity: 0.9,
    faintDetailSensitivity: 0.9,
    surfaceBrightnessClass: "low",
    broadbandDifficulty: "hard",
    minUsableAltitudeDeg: 30,
    minMainAltitudeDeg: 40,
    idealAltitudeDeg: 60,
    maxRecommendedMoonIlluminationMain: 20,
    maxRecommendedMoonIlluminationExtra: 35,
    minRecommendedMoonDistanceDeg: 90,
    coreSaturationRisk: "low",
    framingDifficulty: "hard",
    notes: ["Reflection nebulosity is gradient-sensitive and needs dark transparent sky."]
  },
  planetary_nebula: {
    ...baseProfile,
    moonSensitivity: 0.45,
    twilightSensitivity: 0.45,
    altitudeSensitivity: 0.7,
    gradientSensitivity: 0.4,
    faintDetailSensitivity: 0.45,
    surfaceBrightnessClass: "high",
    broadbandDifficulty: "moderate",
    minUsableAltitudeDeg: 28,
    minMainAltitudeDeg: 35,
    idealAltitudeDeg: 55,
    maxRecommendedMoonIlluminationMain: 60,
    maxRecommendedMoonIlluminationExtra: 80,
    minRecommendedMoonDistanceDeg: 45,
    coreSaturationRisk: "medium",
    framingDifficulty: "easy",
    notes: ["Planetary nebulae are compact and tolerate the Moon better than faint galaxies."]
  },
  diffuse_nebula: {
    ...baseProfile,
    moonSensitivity: 0.65,
    twilightSensitivity: 0.65,
    altitudeSensitivity: 0.68,
    gradientSensitivity: 0.72,
    faintDetailSensitivity: 0.7,
    surfaceBrightnessClass: "medium",
    broadbandDifficulty: "moderate",
    minUsableAltitudeDeg: 27,
    minMainAltitudeDeg: 37,
    idealAltitudeDeg: 55,
    maxRecommendedMoonIlluminationMain: 35,
    maxRecommendedMoonIlluminationExtra: 55,
    minRecommendedMoonDistanceDeg: 65,
    coreSaturationRisk: "medium",
    framingDifficulty: "moderate",
    notes: ["Diffuse nebulae are scored with extra gradient sensitivity."]
  },
  supernova_remnant: {
    ...baseProfile,
    moonSensitivity: 0.68,
    twilightSensitivity: 0.62,
    altitudeSensitivity: 0.7,
    gradientSensitivity: 0.7,
    faintDetailSensitivity: 0.72,
    surfaceBrightnessClass: "medium",
    broadbandDifficulty: "hard",
    minUsableAltitudeDeg: 28,
    minMainAltitudeDeg: 38,
    idealAltitudeDeg: 55,
    maxRecommendedMoonIlluminationMain: 35,
    maxRecommendedMoonIlluminationExtra: 55,
    minRecommendedMoonDistanceDeg: 65,
    coreSaturationRisk: "low",
    framingDifficulty: "moderate",
    notes: ["Supernova remnants need good contrast for faint filaments."]
  },
  nebula_cluster_combo: {
    ...baseProfile,
    moonSensitivity: 0.58,
    twilightSensitivity: 0.56,
    altitudeSensitivity: 0.64,
    gradientSensitivity: 0.6,
    faintDetailSensitivity: 0.58,
    surfaceBrightnessClass: "medium",
    broadbandDifficulty: "moderate",
    minUsableAltitudeDeg: 25,
    minMainAltitudeDeg: 35,
    idealAltitudeDeg: 50,
    maxRecommendedMoonIlluminationMain: 45,
    maxRecommendedMoonIlluminationExtra: 65,
    minRecommendedMoonDistanceDeg: 55,
    coreSaturationRisk: "medium",
    framingDifficulty: "moderate",
    notes: ["Nebula and cluster combinations are scored as mixed targets."]
  },
  asterism: {
    ...baseProfile,
    moonSensitivity: 0.18,
    twilightSensitivity: 0.28,
    altitudeSensitivity: 0.5,
    gradientSensitivity: 0.15,
    faintDetailSensitivity: 0.15,
    surfaceBrightnessClass: "high",
    broadbandDifficulty: "easy",
    minUsableAltitudeDeg: 20,
    minMainAltitudeDeg: 28,
    idealAltitudeDeg: 45,
    maxRecommendedMoonIlluminationMain: 85,
    maxRecommendedMoonIlluminationExtra: 95,
    minRecommendedMoonDistanceDeg: 25,
    coreSaturationRisk: "none",
    framingDifficulty: "easy",
    notes: ["Asterisms and double-star entries are tolerant but less typical DSO projects."]
  },
  unknown: baseProfile
};

export function normalizeCatalogType(shortType: string): DsoObjectType {
  const type = shortType.trim().toLowerCase();
  if (type === "sp" || type === "ba" || type === "ln" || type === "s") return "galaxy_spiral";
  if (type === "el") return "galaxy_elliptical";
  if (type === "ir") return "galaxy_irregular";
  if (type === "gc") return "globular_cluster";
  if (type === "oc") return "open_cluster";
  if (type === "pl") return "planetary_nebula";
  if (type === "di") return "diffuse_nebula";
  if (type === "sn") return "supernova_remnant";
  if (type === "mw") return "nebula_cluster_combo";
  if (type === "as" || type === "ds") return "asterism";
  return "unknown";
}

export function objectTypeLabel(type: DsoObjectType): string {
  return type.replaceAll("_", " ");
}

function surfaceClassFromSizeAndMagnitude(object: Partial<DeepSkyObject>, fallback: SurfaceBrightnessClass): SurfaceBrightnessClass {
  const majorAxis = object.majorAxisArcMin ?? object.apparentSizeArcMin ?? 0;
  const magnitude = object.visualMagnitude ?? 8;
  if (majorAxis >= 60 && magnitude >= 5) return "very_low";
  if (majorAxis >= 18 && magnitude >= 7.5) return "very_low";
  if (majorAxis >= 10 && magnitude >= 8.8) return "low";
  return fallback;
}

function difficultyFromSurface(surface: SurfaceBrightnessClass, fallback: BroadbandDifficulty): BroadbandDifficulty {
  if (surface === "very_low") return "extreme";
  if (surface === "low") return fallback === "easy" ? "moderate" : "hard";
  return fallback;
}

export function buildPlanningProfile(
  objectType: DsoObjectType,
  object: Partial<DeepSkyObject>,
  overrides: Partial<PlanningProfile> = {}
): PlanningProfile {
  const defaults = defaultProfilesByType[objectType] ?? defaultProfilesByType.unknown;
  const surfaceBrightnessClass = overrides.surfaceBrightnessClass ?? surfaceClassFromSizeAndMagnitude(object, defaults.surfaceBrightnessClass);
  const broadbandDifficulty = overrides.broadbandDifficulty ?? difficultyFromSurface(surfaceBrightnessClass, defaults.broadbandDifficulty);

  return {
    ...defaults,
    ...overrides,
    moonSensitivity: clamp01(overrides.moonSensitivity ?? defaults.moonSensitivity),
    twilightSensitivity: clamp01(overrides.twilightSensitivity ?? defaults.twilightSensitivity),
    altitudeSensitivity: clamp01(overrides.altitudeSensitivity ?? defaults.altitudeSensitivity),
    gradientSensitivity: clamp01(overrides.gradientSensitivity ?? defaults.gradientSensitivity),
    faintDetailSensitivity: clamp01(overrides.faintDetailSensitivity ?? defaults.faintDetailSensitivity),
    surfaceBrightnessClass,
    broadbandDifficulty,
    notes: [...defaults.notes, ...(overrides.notes ?? [])]
  };
}

export function setupFieldOfView(profile: DsoSetupProfile): { widthDeg: number; heightDeg: number } | null {
  if (!profile.focalLengthMm || !profile.sensorWidthMm || !profile.sensorHeightMm) return null;
  return {
    widthDeg: 57.2958 * profile.sensorWidthMm / profile.focalLengthMm,
    heightDeg: 57.2958 * profile.sensorHeightMm / profile.focalLengthMm
  };
}

export function setupPixelScaleArcSec(profile: DsoSetupProfile): number | null {
  if (!profile.focalLengthMm || !profile.pixelSizeMicron) return null;
  return 206.265 * profile.pixelSizeMicron / profile.focalLengthMm;
}

export function setupMoonTwilightSensitivityMultiplier(profile: DsoSetupProfile): number {
  if (profile.filterMode === "narrowband") return 0.68;
  if (profile.filterMode === "duo_narrowband") return 0.78;
  if (profile.filterMode === "luminance") return 1.06;
  return profile.isCooled ? 0.96 : 1.05;
}
