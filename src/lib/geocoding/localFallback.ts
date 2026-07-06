import type { GeocodingResult } from "../../types";

const geiselhoeringFallback: GeocodingResult = {
  id: -94333,
  name: "Geiselhöring",
  country: "Deutschland",
  countryCode: "DE",
  admin1: "Bayern",
  latitude: 48.825,
  longitude: 12.397,
  elevationMeters: 360,
  timeZone: "Europe/Berlin",
  postcodes: ["94333"],
  source: "local-fallback"
};

function normalizeQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, "");
}

export function localFallbackResults(query: string): GeocodingResult[] {
  const normalized = normalizeQuery(query);
  const geiselhoeringMatches = new Set(["geiselhoring", "geiselhoering", "94333"]);

  return geiselhoeringMatches.has(normalized) ? [geiselhoeringFallback] : [];
}
