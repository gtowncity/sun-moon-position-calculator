import type { ExportMetadata, Language, ObserverLocation, RefractionSettings, TargetBody, TimeRangeMode } from "../../types";

export const appVersion = "0.2.0";
export const runtimeAlgorithm = "astronomy-engine topocentric equator/horizon; NREL SPA documented as solar reference target";
export const accuracyNote = "Runtime results must be validated against real JPL Horizons/NREL fixtures before claiming the target tolerances.";

export interface MetadataInput {
  language: Language;
  locationName: string;
  location: ObserverLocation;
  timeZone: string;
  targetBodies: TargetBody;
  startLocal: string;
  endLocal: string;
  intervalMinutes: number | null;
  rangeMode: TimeRangeMode;
  refraction: RefractionSettings;
}

export function createExportMetadata(input: MetadataInput): ExportMetadata {
  return {
    appVersion,
    createdAtUtc: new Date().toISOString(),
    locationName: input.locationName || "unspecified",
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    elevationMeters: input.location.elevationMeters,
    timeZone: input.timeZone,
    targetBodies: input.targetBodies,
    startLocal: input.startLocal,
    endLocal: input.endLocal,
    intervalMinutes: input.intervalMinutes,
    rangeMode: input.rangeMode,
    algorithm: runtimeAlgorithm,
    refraction: input.refraction,
    accuracyNote,
    language: input.language
  };
}
