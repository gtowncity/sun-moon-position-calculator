import { describe, expect, it } from "vitest";
import { getMessierObject } from "../src/dso/catalog/messierCatalog";
import { airmassApprox } from "../src/dso/math/airmass";
import { angularSeparationDeg } from "../src/dso/math/angles";
import { calculateAltitudeScore } from "../src/dso/scoring/altitudeScore";
import { calculateFinalDsoScore } from "../src/dso/scoring/dsoScore";
import { calculateMoonScore } from "../src/dso/scoring/moonScore";
import { calculateSunScore } from "../src/dso/scoring/sunScore";
import { defaultDsoSetupProfile, qualityProfileById } from "../src/dso/catalog/objectProfiles";

const normal = qualityProfileById("normal");

function object(id: string) {
  const found = getMessierObject(id);
  if (!found) throw new Error(`Missing ${id}`);
  return found;
}

describe("DSO math and scoring", () => {
  it("calculates angular separation and simple airmass plausibly", () => {
    expect(angularSeparationDeg(0, 0, 0, 0)).toBeCloseTo(0, 6);
    expect(angularSeparationDeg(0, 0, 90, 0)).toBeCloseTo(90, 6);
    expect(airmassApprox(90)).toBeCloseTo(1, 3);
    expect(airmassApprox(30)).toBeCloseTo(2, 3);
    expect(airmassApprox(-1)).toBeNull();
  });

  it("applies altitude and sun thresholds with object profiles", () => {
    const m31 = object("M31");

    expect(calculateAltitudeScore(18, m31.planningProfile)).toBeLessThan(30);
    expect(calculateAltitudeScore(45, m31.planningProfile)).toBeGreaterThan(70);
    expect(calculateSunScore(-18.2, m31.planningProfile)).toBe(100);
    expect(calculateSunScore(-15, m31.planningProfile)).toBeLessThan(45);
  });

  it("gives no moon penalty when the Moon is below the horizon", () => {
    const score = calculateMoonScore(-2, 95, 10, object("M101").planningProfile);

    expect(score.score).toBe(100);
    expect(score.state).toBe("below_horizon");
  });

  it("scores globular clusters more moon-tolerant than faint galaxies", () => {
    const m13 = object("M13");
    const m101 = object("M101");
    const m45 = object("M45");
    const m31 = object("M31");
    const m81 = object("M81");
    const moonM13 = calculateMoonScore(42, 70, 42, m13.planningProfile);
    const moonM101 = calculateMoonScore(42, 70, 42, m101.planningProfile);
    const moonM45 = calculateMoonScore(42, 70, 42, m45.planningProfile);
    const moonM31 = calculateMoonScore(28, 45, 70, m31.planningProfile);
    const moonM81 = calculateMoonScore(28, 45, 70, m81.planningProfile);

    expect(moonM13.score).toBeGreaterThan(moonM101.score);
    expect(moonM13.score).toBeGreaterThan(moonM45.score);
    expect(moonM31.score).toBeGreaterThan(moonM81.score);
  });

  it("prevents MAIN when a hard guard is violated", () => {
    const m101 = object("M101");
    const moonScore = calculateMoonScore(55, 90, 25, m101.planningProfile);
    const result = calculateFinalDsoScore({
      object: m101,
      sunAltitudeDeg: -18.5,
      sunScore: 100,
      moonScore: moonScore.score,
      moonIlluminationPercent: 90,
      moonAltitudeDeg: 55,
      moonDistanceDeg: 25,
      targetAltitudeDeg: 60,
      targetAltitudeScore: 100,
      qualityProfile: normal,
      setupProfile: defaultDsoSetupProfile
    });

    expect(result.category).not.toBe("MAIN");
    expect(result.warnings.join(" ")).toMatch(/Moon|gradients/i);
  });
});
