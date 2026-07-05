import type { GeocodingResult, Language } from "../../types";

export interface GeocodingProvider {
  search(query: string, language: Language, countryCode?: string): Promise<GeocodingResult[]>;
}
