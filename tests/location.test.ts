import { describe, expect, it, vi } from "vitest";
import { getBrowserLocation } from "../src/lib/location/geolocation";
import { validateCoordinates } from "../src/lib/location/validation";

describe("coordinate validation", () => {
  it("accepts valid coordinates and optional elevation", () => {
    const result = validateCoordinates(" 52,52 ", "13.405", "360,5");

    expect(result.errors).toEqual([]);
    expect(result.location).toEqual({
      latitude: 52.52,
      longitude: 13.405,
      elevationMeters: 360.5
    });
  });

  it("accepts dot decimals and empty optional elevation", () => {
    const result = validateCoordinates("48.822306", "12.392", "");

    expect(result.errors).toEqual([]);
    expect(result.location?.elevationMeters).toBe(0);
  });

  it("rejects out-of-range and non-numeric values", () => {
    const result = validateCoordinates("91", "-181", "abc");

    expect(result.errors).toEqual(["invalidLatitude", "invalidLongitude", "invalidElevation"]);
    expect(result.location).toBeUndefined();
  });

  it("rejects invalid comma and dot formats", () => {
    expect(validateCoordinates("48,82,23", "12", "").errors).toContain("invalidLatitude");
    expect(validateCoordinates("48.82.23", "12", "").errors).toContain("invalidLatitude");
    expect(validateCoordinates("", "12", "").errors).toContain("invalidLatitude");
  });
});

describe("browser geolocation", () => {
  it("resolves a mocked browser position", async () => {
    const geolocation = {
      getCurrentPosition: vi.fn((success: PositionCallback) => {
        success({
          coords: {
            latitude: 10,
            longitude: 20,
            altitude: 30,
            accuracy: 15,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: 1
        } as GeolocationPosition);
      })
    } as unknown as Geolocation;

    await expect(getBrowserLocation(geolocation)).resolves.toEqual({
      latitude: 10,
      longitude: 20,
      elevationMeters: 30,
      accuracyMeters: 15
    });
  });

  it("rejects when geolocation is unavailable", async () => {
    await expect(getBrowserLocation(undefined)).rejects.toThrow("geolocationUnsupported");
  });
});
