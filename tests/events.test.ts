import { describe, expect, it } from "vitest";
import { calculateDailyEvents } from "../src/astro/events";

describe("daily events", () => {
  it("returns rise, set and transit slots for selected bodies", () => {
    const events = calculateDailyEvents({
      observer: { latitude: 52.52, longitude: 13.405, elevationMeters: 34 },
      bodySelection: "both",
      timeZone: "Europe/Berlin",
      localDate: "2026-07-03",
      refraction: { mode: "standard", pressureHpa: 1013.25, temperatureC: 15 }
    });

    expect(events).toHaveLength(6);
    expect(events.map((event) => `${event.body}:${event.kind}`)).toEqual([
      "sun:rise",
      "sun:set",
      "sun:transit",
      "moon:rise",
      "moon:set",
      "moon:transit"
    ]);
    expect(events.every((event) => event.status === "found" || event.status === "not_found")).toBe(true);
  });
});
