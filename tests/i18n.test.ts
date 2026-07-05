import { describe, expect, it } from "vitest";
import { translations } from "../src/i18n";

describe("i18n dictionaries", () => {
  it("have the same keys in German and English", () => {
    expect(Object.keys(translations.de).sort()).toEqual(Object.keys(translations.en).sort());
  });
});
