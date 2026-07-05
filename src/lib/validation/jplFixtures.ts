export interface JplFixtureMetadata {
  source: "JPL Horizons";
  generatedAt: string;
  queryUrl: string;
  target: "10" | "301";
  refraction: "AIRLESS" | "REFRACTED";
}

export const jplFixturesStatus =
  "TODO: No JPL Horizons reference values are committed yet. Tests must not invent fixture values.";

