import type { GeocodingResult, Language } from "../../types";
import type { GeocodingProvider } from "./provider";

interface OpenMeteoResponse {
  results?: Array<{
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    elevation?: number;
    country_code: string;
    country?: string;
    admin1?: string;
    timezone?: string;
    postcodes?: string[];
  }>;
  error?: boolean;
  reason?: string;
}

export class GeocodingHttpError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string
  ) {
    super(`HTTP ${status}: ${reason}`);
    this.name = "GeocodingHttpError";
  }
}

export class GeocodingNetworkError extends Error {
  constructor() {
    super("Network error");
    this.name = "GeocodingNetworkError";
  }
}

export class OpenMeteoGeocodingProvider implements GeocodingProvider {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async search(query: string, language: Language, countryCode?: string): Promise<GeocodingResult[]> {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      return [];
    }

    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
    url.searchParams.set("name", trimmed);
    url.searchParams.set("count", "10");
    url.searchParams.set("language", language);
    url.searchParams.set("format", "json");

    if (countryCode && /^[A-Z]{2}$/.test(countryCode)) {
      url.searchParams.set("countryCode", countryCode);
    }

    let response: Response;

    try {
      response = await this.fetcher(url.toString());
    } catch {
      throw new GeocodingNetworkError();
    }

    const data = (await response.json().catch(() => ({}))) as OpenMeteoResponse;

    if (!response.ok) {
      throw new GeocodingHttpError(response.status, data.reason ?? response.statusText);
    }

    if (data.error) {
      throw new GeocodingHttpError(response.status, data.reason ?? "Open-Meteo returned an error.");
    }

    return (data.results ?? []).map((result) => ({
      id: result.id,
      name: result.name,
      country: result.country ?? result.country_code,
      countryCode: result.country_code,
      admin1: result.admin1,
      latitude: result.latitude,
      longitude: result.longitude,
      elevationMeters: result.elevation,
      timeZone: result.timezone,
      postcodes: result.postcodes
    }));
  }
}
