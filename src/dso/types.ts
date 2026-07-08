import type { ObserverLocation } from "../types";

export type DsoObjectType =
  | "galaxy_spiral"
  | "galaxy_elliptical"
  | "galaxy_irregular"
  | "globular_cluster"
  | "open_cluster"
  | "emission_nebula"
  | "reflection_nebula"
  | "planetary_nebula"
  | "diffuse_nebula"
  | "supernova_remnant"
  | "nebula_cluster_combo"
  | "asterism"
  | "unknown";

export type SurfaceBrightnessClass = "high" | "medium" | "low" | "very_low";
export type BroadbandDifficulty = "easy" | "moderate" | "hard" | "extreme";
export type DsoCategory = "MAIN" | "EXTRA" | "TEST" | "BAD";
export type TwilightClass =
  | "daylight"
  | "civil_twilight"
  | "nautical_twilight"
  | "astronomical_twilight"
  | "astronomical_night";
export type MoonState = "below_horizon" | "low_far" | "low_near" | "high_far" | "high_near" | "severe";
export type QualityProfileId = "strict" | "normal" | "aggressive";
export type CoreSaturationRisk = "none" | "low" | "medium" | "high";
export type FramingDifficulty = "easy" | "moderate" | "hard";
export type DataQuality = "complete" | "estimated" | "partial";

export interface PlanningProfile {
  moonSensitivity: number;
  twilightSensitivity: number;
  altitudeSensitivity: number;
  gradientSensitivity: number;
  faintDetailSensitivity: number;
  surfaceBrightnessClass: SurfaceBrightnessClass;
  broadbandDifficulty: BroadbandDifficulty;
  minUsableAltitudeDeg: number;
  minMainAltitudeDeg: number;
  idealAltitudeDeg: number;
  maxRecommendedMoonIlluminationMain?: number;
  maxRecommendedMoonIlluminationExtra?: number;
  minRecommendedMoonDistanceDeg?: number;
  coreSaturationRisk: CoreSaturationRisk;
  framingDifficulty: FramingDifficulty;
  recommendedUse?: Array<Exclude<DsoCategory, "BAD">>;
  notes: string[];
}

export interface DeepSkyObject {
  id: string;
  messierNumber: number;
  primaryName: string;
  germanName?: string;
  aliases: string[];
  raHours: number;
  raDeg: number;
  decDeg: number;
  constellation: string;
  objectType: DsoObjectType;
  objectSubType?: string;
  visualMagnitude?: number;
  apparentSizeArcMin?: number;
  majorAxisArcMin?: number;
  minorAxisArcMin?: number;
  surfaceBrightness?: string;
  distanceLy?: string;
  notes?: string[];
  dataQuality: DataQuality;
  dataCompleteness: number;
  planningProfile: PlanningProfile;
}

export interface QualityProfile {
  id: QualityProfileId;
  name: string;
  description: string;
  mainScoreThreshold: number;
  extraScoreThreshold: number;
  testScoreThreshold: number;
  sunMainAltitudeDeg: number;
  sunExtraAltitudeDeg: number;
  moonPenaltyMultiplier: number;
  altitudeStrictnessOffsetDeg: number;
  allowTwilightMainForBrightObjects: boolean;
}

export interface DsoSetupProfile {
  id: string;
  name: string;
  telescopeName?: string;
  apertureMm?: number;
  focalLengthMm?: number;
  fRatio?: number;
  cameraName?: string;
  sensorType?: string;
  pixelSizeMicron?: number;
  sensorWidthMm?: number;
  sensorHeightMm?: number;
  isMono?: boolean;
  isCooled?: boolean;
  filterMode: "broadband_rgb" | "duo_narrowband" | "narrowband" | "luminance" | "unknown";
  guidingEnabled?: boolean;
  mountName?: string;
  notes?: string[];
}

export interface DsoLocationProfile extends ObserverLocation {
  id: string;
  name: string;
  timezone: string;
  bortle?: number;
  sqm?: number;
  localLightPollutionNotes?: string;
}

export interface DsoDateExceptions {
  forceInclude: string[];
  exclude: string[];
}

export interface DsoPlannerSettings {
  location: ObserverLocation;
  locationName: string;
  timeZone: string;
  startDate: string;
  endDate: string;
  weekendOnly: boolean;
  exceptions: DsoDateExceptions;
  intervalMinutes: number;
  objectId: string;
  setupProfile: DsoSetupProfile;
  qualityProfile: QualityProfile;
  mode: "range" | "targetHours";
  targetEffectiveHours?: number;
  bortle?: number;
  sqm?: number;
}

export interface TargetAltAz {
  altitudeDeg: number;
  azimuthDeg: number;
  hourAngleDeg: number;
}

export interface DsoInterval {
  localDateTime: string;
  utcDateTime: string;
  nightLabel: string;
  intervalIndex: number;
  sunAltitudeDeg: number;
  sunAzimuthDeg: number;
  twilightClass: TwilightClass;
  sunScore: number;
  moonAltitudeDeg: number;
  moonAzimuthDeg: number;
  moonIlluminationPercent: number;
  moonPhaseAngle?: number;
  moonAboveHorizon: boolean;
  angularSeparationMoonTargetDeg: number;
  moonScore: number;
  moonPenaltyReason: string;
  moonState: MoonState;
  targetAltitudeDeg: number;
  targetAzimuthDeg: number;
  targetAirmassApprox: number | null;
  targetVisible: boolean;
  targetAboveUsableAltitude: boolean;
  targetAboveMainAltitude: boolean;
  targetAltitudeScore: number;
  targetCulminationTime: string | null;
  targetMaxAltitudeThisNight: number;
  targetRisingOrSetting?: "rising" | "setting" | "transit";
  targetHourAngle?: number;
  finalDsoScore: number;
  category: DsoCategory;
  effectiveWeight: number;
  reasons: string[];
  warnings: string[];
}

export interface DsoWindow {
  nightLabel: string;
  objectId: string;
  objectName: string;
  startUtc: string;
  endUtc: string;
  startLocal: string;
  endLocal: string;
  durationMinutes: number;
  effectiveDurationMinutes: number;
  averageScore: number;
  minScore: number;
  maxScore: number;
  category: DsoCategory;
  averageSunAltitude: number;
  averageMoonIllumination: number;
  averageMoonAltitude: number;
  averageMoonDistance: number;
  averageTargetAltitude: number;
  maxTargetAltitude: number;
  reasonsSummary: string[];
  warningsSummary: string[];
  selectedForTarget?: boolean;
}

export interface DsoNightPlan {
  nightLabel: string;
  dateStart: string;
  dateEnd: string;
  selectedObject: DeepSkyObject;
  locationName: string;
  setupProfileName: string;
  intervalMinutes: number;
  astronomicalNightStart: string | null;
  astronomicalNightEnd: string | null;
  targetFirstAboveHorizon: string | null;
  targetLastAboveHorizon: string | null;
  targetCulminationTime: string | null;
  targetMaxAltitudeDeg: number;
  timeAbove20: number;
  timeAbove25: number;
  timeAbove30: number;
  timeAbove35: number;
  timeAbove40: number;
  timeAbove45: number;
  timeAbove60: number;
  bestWindowStart: string | null;
  bestWindowEnd: string | null;
  mainDuration: number;
  extraDuration: number;
  testDuration: number;
  badDuration: number;
  effectiveDuration: number;
  bestAverageScore: number;
  overallNightRating: "excellent" | "good" | "usable" | "poor" | "bad";
  mainReasons: string[];
  mainWarnings: string[];
  intervals: DsoInterval[];
  windows: DsoWindow[];
}

export interface DsoTargetHoursPlan {
  targetEffectiveMinutes: number;
  reached: boolean;
  realDurationMinutes: number;
  effectiveDurationMinutes: number;
  mainEffectiveMinutes: number;
  extraEffectiveMinutes: number;
  selectedWindows: DsoWindow[];
  remainingEffectiveMinutes: number;
}

export interface DsoPlan {
  generatedAtUtc: string;
  settings: DsoPlannerSettings;
  object: DeepSkyObject;
  nights: DsoNightPlan[];
  recommendedWindows: DsoWindow[];
  targetHoursPlan: DsoTargetHoursPlan | null;
  totals: {
    mainMinutes: number;
    extraMinutes: number;
    testMinutes: number;
    effectiveMinutes: number;
  };
  calendar: Array<{
    date: string;
    nightLabel: string;
    status: "included" | "excluded" | "forced";
    reason: string;
  }>;
  warnings: string[];
}
