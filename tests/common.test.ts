import { describe, expect, it } from "vitest";
import { normalizeDegrees, zenithFromAltitude } from "../src/astro/common/angles";
import { bennettRefractionDegrees } from "../src/astro/common/refraction";

describe("angle helpers", () => {
  it("normalizes degrees into 0..360", () => {
    expect(normalizeDegrees(0)).toBe(0);
    expect(normalizeDegrees(360)).toBe(0);
    expect(normalizeDegrees(-10)).toBe(350);
    expect(normalizeDegrees(725)).toBe(5);
  });

  it("calculates zenith from altitude", () => {
    expect(zenithFromAltitude(20)).toBe(70);
  });
});

describe("refraction helper", () => {
  it("adds a positive correction near the horizon", () => {
    expect(bennettRefractionDegrees(0, 1013.25, 15)).toBeGreaterThan(0);
  });

  it("returns zero outside the supported low-altitude range below -1 degree", () => {
    expect(bennettRefractionDegrees(-2, 1013.25, 15)).toBe(0);
  });
});
