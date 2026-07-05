import { describe, expect, it, vi } from "vitest";
import {
  GeocodingHttpError,
  GeocodingNetworkError,
  OpenMeteoGeocodingProvider
} from "../src/lib/geocoding/openMeteo";

describe("Open-Meteo geocoding provider", () => {
  it("maps results without selecting the first result automatically", async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          {
            id: 1,
            name: "Geiselhöring",
            latitude: 48.825,
            longitude: 12.397,
            elevation: 360,
            country_code: "DE",
            country: "Germany",
            admin1: "Bavaria",
            timezone: "Europe/Berlin",
            postcodes: ["94333"]
          }
        ]
      })
    }) as Response);

    const provider = new OpenMeteoGeocodingProvider(fetcher as unknown as typeof fetch);
    const results = await provider.search(" Geiselhöring ", "de");

    expect(fetcher).toHaveBeenCalledOnce();
    const calledUrl = (fetcher.mock.calls as unknown as string[][])[0][0];
    expect(calledUrl).toContain("Geiselh%C3%B6ring");
    expect(calledUrl).toContain("language=de");
    expect(results[0]).toMatchObject({ name: "Geiselhöring", countryCode: "DE", timeZone: "Europe/Berlin" });
  });

  it("uses an explicit country code when provided for postal-code searches", async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ results: [] }) }) as Response);
    const provider = new OpenMeteoGeocodingProvider(fetcher as unknown as typeof fetch);

    await provider.search("94333", "de", "DE");

    const calledUrl = (fetcher.mock.calls as unknown as string[][])[0][0];
    expect(calledUrl).toContain("name=94333");
    expect(calledUrl).toContain("countryCode=DE");
  });

  it("does not silently force a country code", async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ results: [] }) }) as Response);
    const provider = new OpenMeteoGeocodingProvider(fetcher as unknown as typeof fetch);

    await provider.search("94333", "de");

    const calledUrl = (fetcher.mock.calls as unknown as string[][])[0][0];
    expect(calledUrl).not.toContain("countryCode=");
  });

  it("returns empty results", async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }) as Response);
    const provider = new OpenMeteoGeocodingProvider(fetcher as unknown as typeof fetch);

    await expect(provider.search("Nowhere", "en")).resolves.toEqual([]);
  });

  it("throws HTTP errors with Open-Meteo reason", async () => {
    const fetcher = vi.fn(async () => ({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({ error: true, reason: "Parameter count must be between 1 and 100." })
    }) as Response);
    const provider = new OpenMeteoGeocodingProvider(fetcher as unknown as typeof fetch);

    await expect(provider.search("Berlin", "en")).rejects.toEqual(new GeocodingHttpError(400, "Parameter count must be between 1 and 100."));
  });

  it("throws a network error separately", async () => {
    const fetcher = vi.fn(async () => { throw new Error("offline"); });
    const provider = new OpenMeteoGeocodingProvider(fetcher as unknown as typeof fetch);

    await expect(provider.search("Berlin", "en")).rejects.toBeInstanceOf(GeocodingNetworkError);
  });

  it("returns no results for too-short queries", async () => {
    const fetcher = vi.fn();
    const provider = new OpenMeteoGeocodingProvider(fetcher as unknown as typeof fetch);

    await expect(provider.search("x", "en")).resolves.toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
