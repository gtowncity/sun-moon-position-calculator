export interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone?: string;
  country?: string;
  admin1?: string;
  postcodes?: string[];
}

interface OpenMeteoResult {
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone?: string;
  country?: string;
  admin1?: string;
  postcodes?: string[];
}

interface OpenMeteoResponse {
  results?: OpenMeteoResult[];
}

export async function searchLocation(query: string): Promise<GeocodingResult> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    throw new Error("Bitte mindestens 2 Zeichen fuer Ort oder PLZ eingeben.");
  }

  const params = new URLSearchParams({
    name: trimmed,
    count: "1",
    language: "de",
    format: "json",
    countryCode: "DE"
  });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Ortssuche konnte nicht geladen werden.");
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const first = data.results?.[0];
  if (!first) {
    throw new Error("Kein Ort oder keine PLZ gefunden.");
  }

  return first;
}

export const formatLocationLabel = (result: GeocodingResult) => {
  const postcode = result.postcodes?.[0];
  const parts = [postcode, result.name, result.admin1].filter(Boolean);
  return parts.join(" ");
};
