import { describe, expect, it } from "vitest";
import { addHours, generateIntervalInstants, localDateTimeToInstant } from "../src/lib/time/dateTime";

describe("time validation and conversion", () => {
  it("converts a normal local time to a UTC instant", () => {
    const result = localDateTimeToInstant("2026-01-15", "12:00", "Europe/Berlin");

    expect(result.status).toBe("ok");
    expect(result.instant?.toString()).toBe("2026-01-15T11:00:00Z");
  });

  it("detects DST gaps", () => {
    const result = localDateTimeToInstant("2026-03-29", "02:30", "Europe/Berlin");

    expect(result.status).toBe("gap");
    expect(result.messageKey).toBe("dstGap");
  });

  it("detects DST duplicate local times and returns the earlier instant", () => {
    const result = localDateTimeToInstant("2026-10-25", "02:30", "Europe/Berlin");

    expect(result.status).toBe("ambiguous");
    expect(result.messageKey).toBe("dstAmbiguous");
    expect(result.instant?.toString()).toBe("2026-10-25T00:30:00Z");
  });

  it("generates intervals on UTC instants", () => {
    const start = localDateTimeToInstant("2026-01-15", "12:00", "UTC").instant;
    expect(start).toBeDefined();

    const end = addHours(start!, 1);
    const result = generateIntervalInstants(start!, end, 30);

    expect(result.instants.map((instant) => instant.toString())).toEqual([
      "2026-01-15T12:00:00Z",
      "2026-01-15T12:30:00Z",
      "2026-01-15T13:00:00Z"
    ]);
  });
});

