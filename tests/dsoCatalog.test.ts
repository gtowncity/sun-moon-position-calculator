import { describe, expect, it } from "vitest";
import { getMessierObject, messierCatalog } from "../src/dso/catalog/messierCatalog";
import { searchMessierObjects } from "../src/dso/catalog/messierSearch";

describe("DSO Messier catalog", () => {
  it("contains all Messier objects M1 to M110", () => {
    expect(messierCatalog).toHaveLength(110);
    for (let number = 1; number <= 110; number += 1) {
      expect(getMessierObject(`M${number}`)?.messierNumber).toBe(number);
    }
  });

  it("supports object search by Messier id, common name and alias", () => {
    expect(searchMessierObjects("Andromeda")[0]?.id).toBe("M31");
    expect(searchMessierObjects("NGC 224")[0]?.id).toBe("M31");
    expect(searchMessierObjects("Hercules Globular Cluster")[0]?.id).toBe("M13");
  });

  it("keeps M102 with the required ambiguity note", () => {
    const m102 = getMessierObject("M102");

    expect(m102?.aliases).toContain("NGC 5866");
    expect(m102?.notes?.join(" ")).toContain("Historically ambiguous / spurious Messier object");
  });

  it("gives every object coordinates, a normalized type and a planning profile", () => {
    for (const object of messierCatalog) {
      expect(Number.isFinite(object.raHours)).toBe(true);
      expect(Number.isFinite(object.decDeg)).toBe(true);
      expect(object.objectType).toBeTruthy();
      expect(object.planningProfile.minUsableAltitudeDeg).toBeGreaterThan(0);
      expect(object.planningProfile.moonSensitivity).toBeGreaterThanOrEqual(0);
      expect(object.planningProfile.moonSensitivity).toBeLessThanOrEqual(1);
    }
  });
});
