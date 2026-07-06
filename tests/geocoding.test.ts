import { describe, expect, it, vi } from "vitest";
import {
  GeocodingNetworkError,
  OpenMeteoGeocodingProvider
} from "../src/lib/geocoding/openMeteo";
import { localFallbackResults } from "../src/lib/geocoding/localFallback";

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

  it("encodes Berlin and London searches", async () => {
    const fetcher = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ results: [] }) }) as Response);
    const provider = new OpenMeteoGeocodingProvider(fetcher as unknown as typeof fetch);

    await provider.search("Berlin", "en");
    await provider.search("London", "en");

    expect((fetcher.mock.calls[0] as unknown as string[])[0]).toContain("name=Berlin");
    expect((fetcher.mock.calls[1] as unknown as string[])[0]).toContain("name=London");
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

    await expect(provider.search("Berlin", "en")).rejects.toMatchObject({
      name: "GeocodingHttpError",
      status: 400,
      reason: "Parameter count must be between 1 and 100.",
      requestUrl: expect.stringContaining("name=Berlin")
    });
  });

  it("throws a network error with diagnostics separately", async () => {
    const fetcher = vi.fn(async () => { throw new Error("offline"); });
    const provider = new OpenMeteoGeocodingProvider(fetcher as unknown as typeof fetch);

    await expect(provider.search("Berlin", "en")).rejects.toBeInstanceOf(GeocodingNetworkError);
    await expect(provider.search("Berlin", "en")).rejects.toMatchObject({
      requestUrl: expect.stringContaining("name=Berlin"),
      originalErrorName: "Error",
      originalErrorMessage: "offline",
      isTimeout: false
    });
  });

  it("marks aborted requests as timeout", async () => {
    const fetcher = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("The operation was aborted.", "AbortError")));
    }));
    const provider = new OpenMeteoGeocodingProvider(fetcher as unknown as typeof fetch, 1);

    await expect(provider.search("Berlin", "en")).rejects.toMatchObject({
      originalErrorName: "AbortError",
      isTimeout: true
    });
  });

  it("returns no results for too-short queries", async () => {
    const fetcher = vi.fn();
    const provider = new OpenMeteoGeocodingProvider(fetcher as unknown as typeof fetch);

    await expect(provider.search("x", "en")).resolves.toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("local geocoding fallback", () => {
  it.each(["Geiselhöring", "Geiselhoering", "geiselhöring", "94333"])("matches %s", (query) => {
    expect(localFallbackResults(query)[0]).toMatchObject({
      name: "Geiselhöring",
      latitude: 48.825,
      longitude: 12.397,
      timeZone: "Europe/Berlin",
      source: "local-fallback"
    });
  });

  it("does not match unrelated queries", () => {
    expect(localFallbackResults("Berlin")).toEqual([]);
    expect(localFallbackResults("asdfasdfasdf")).toEqual([]);
  });
});
