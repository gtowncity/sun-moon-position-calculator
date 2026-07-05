import { describe, expect, it } from "vitest";
import { sortResultRows } from "../src/lib/results/sort";
import { makeRow } from "./helpers";

describe("sortResultRows", () => {
  it("groups by body and sorts within each body by UTC time", () => {
    const sorted = sortResultRows([
      makeRow("moon", "2026-01-01T00:10:00Z"),
      makeRow("sun", "2026-01-01T00:20:00Z"),
      makeRow("sun", "2026-01-01T00:10:00Z"),
      makeRow("moon", "2026-01-01T00:00:00Z")
    ]);

    expect(sorted.map((item) => `${item.body}:${item.utcTime}`)).toEqual([
      "sun:2026-01-01T00:10:00Z",
      "sun:2026-01-01T00:20:00Z",
      "moon:2026-01-01T00:00:00Z",
      "moon:2026-01-01T00:10:00Z"
    ]);
  });

  it("supports custom body order", () => {
    const sorted = sortResultRows([makeRow("sun", "2026-01-01T00:00:00Z"), makeRow("moon", "2026-01-01T00:00:00Z")], [
      "moon",
      "sun"
    ]);

    expect(sorted.map((item) => item.body)).toEqual(["moon", "sun"]);
  });
});
