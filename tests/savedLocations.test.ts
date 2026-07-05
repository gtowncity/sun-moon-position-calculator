import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteSavedLocation,
  loadSavedLocations,
  markSavedLocationUsed,
  upsertSavedLocation
} from "../src/lib/location/savedLocations";

describe("saved locations", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("saves, applies metadata, updates usage, and deletes locations in localStorage", () => {
    let locations = upsertSavedLocation(
      {
        name: "Home",
        latitude: 48.822306,
        longitude: 12.392,
        elevationMeters: 360.5,
        timeZone: "Europe/Berlin",
        source: "manual"
      },
      localStorage,
      "loc-1"
    );

    expect(locations).toHaveLength(1);
    expect(loadSavedLocations()).toEqual(locations);

    locations = markSavedLocationUsed("loc-1", localStorage, "2026-01-01T00:00:00.000Z");
    expect(locations[0].lastUsedAt).toBe("2026-01-01T00:00:00.000Z");

    locations = deleteSavedLocation("loc-1");
    expect(locations).toEqual([]);
  });
});

