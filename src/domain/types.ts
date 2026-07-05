export type Language = "de" | "en";

export type CelestialBody = "sun" | "moon";
export type TargetBody = CelestialBody | "both";
export type BodySelection = TargetBody;

export type LocationSource = "manual" | "geolocation" | "geocoding";
export type TimeRangeMode = "single" | "end" | "duration";
export type RangeMode = TimeRangeMode;
export type RefractionMode = "none" | "standard" | "custom";

export type CalculationWarning =
  | "nearHorizon"
  | "dstAmbiguous"
  | "tooManyRows"
  | "noRise"
  | "noSet"
  | "noTransit"
  | "referencePending";

export type MoonPhaseName =
  | "newMoon"
  | "waxingCrescent"
  | "firstQuarter"
  | "waxingGibbous"
  | "fullMoon"
  | "waningGibbous"
  | "thirdQuarter"
  | "waningCrescent";

export interface ObserverLocation {
  latitude: number;
  longitude: number;
  elevationMeters: number;
}

export interface RefractionSettings {
  mode: RefractionMode;
  pressureHpa: number;
  temperatureC: number;
}

export interface CalculationOptions {
  refraction: RefractionSettings;
  maxTimePoints: number;
}

export interface CalculationRequest {
  instants: import("@js-temporal/polyfill").Temporal.Instant[];
  observer: ObserverLocation;
  bodySelection: TargetBody;
  timeZone: string;
  options: CalculationOptions;
}

export interface PositionRow {
  index: number;
  localDate: string;
  localTime: string;
  timeZone: string;
  utcTime: string;
  latitude: number;
  longitude: number;
  elevationMeters: number;
  body: CelestialBody;
  azimuthDeg: number;
  apparentAltitudeDeg: number;
  geometricAltitudeDeg: number;
  apparentZenithDeg: number;
  geometricZenithDeg: number;
  altitudeDeg: number;
  zenithDeg: number;
  rightAscension: number;
  declinationDeg: number;
  distanceKm: number | null;
  phaseName: MoonPhaseName | null;
  illuminationPercent: number | null;
  warnings: CalculationWarning[];
  algorithm: string;
}

export type ResultRow = PositionRow;

export type EventKind = "rise" | "set" | "transit";
export type EventStatus = "found" | "not_found" | "error";

export interface EventResult {
  body: CelestialBody;
  kind: EventKind;
  status: EventStatus;
  localDate: string | null;
  localTime: string | null;
  timeZone: string;
  utcTime: string | null;
  azimuthDeg: number | null;
  apparentAltitudeDeg: number | null;
  geometricAltitudeDeg: number | null;
  warning: CalculationWarning | null;
}

export interface ExportMetadata {
  appVersion: string;
  createdAtUtc: string;
  locationName: string;
  latitude: number;
  longitude: number;
  elevationMeters: number;
  timeZone: string;
  targetBodies: TargetBody;
  startLocal: string;
  endLocal: string;
  intervalMinutes: number | null;
  rangeMode: TimeRangeMode;
  algorithm: string;
  refraction: RefractionSettings;
  accuracyNote: string;
  language: Language;
}

export interface ValidationCase {
  id: string;
  source: "JPL Horizons" | "NREL SPA";
  retrievalDate: string;
  targetBody: CelestialBody;
  location: ObserverLocation & { name: string };
  timeZone: string;
  utcTime: string;
  expectedAzimuthDeg: number | "TODO_REFERENCE_VALUE";
  expectedAltitudeDeg: number | "TODO_REFERENCE_VALUE";
  toleranceAzimuthDeg: number;
  toleranceAltitudeDeg: number;
  refraction: RefractionMode;
  notes: string;
}

export interface GeocodingResult {
  id: number;
  name: string;
  country: string;
  countryCode: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  elevationMeters?: number;
  timeZone?: string;
  postcodes?: string[];
}

export interface BrowserLocationResult extends ObserverLocation {
  accuracyMeters?: number;
}

export interface SavedLocation extends ObserverLocation {
  id: string;
  name: string;
  timeZone: string;
  source: LocationSource;
  lastUsedAt?: string;
}

export interface CalculationFormState {
  language: Language;
  bodySelection: TargetBody;
  latitude: string;
  longitude: string;
  elevationMeters: string;
  locationName: string;
  locationSource: LocationSource;
  searchCountryCode: string;
  startDate: string;
  startTime: string;
  rangeMode: TimeRangeMode;
  endDate: string;
  endTime: string;
  durationHours: string;
  intervalPreset: string;
  customIntervalMinutes: string;
  intervalMinutes: number;
  timeZone: string;
  refractionMode: RefractionMode;
  pressureHpa: string;
  temperatureC: string;
}
