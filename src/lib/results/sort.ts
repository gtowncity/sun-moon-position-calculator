import type { CelestialBody, ResultRow } from "../../types";

const defaultBodyOrder: CelestialBody[] = ["sun", "moon"];

export function sortResultRows(
  rows: ResultRow[],
  bodyOrder: CelestialBody[] = defaultBodyOrder
): ResultRow[] {
  const order = new Map(bodyOrder.map((body, index) => [body, index]));

  return [...rows].sort((a, b) => {
    const bodyCompare = (order.get(a.body) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.body) ?? Number.MAX_SAFE_INTEGER);

    if (bodyCompare !== 0) {
      return bodyCompare;
    }

    return a.utcTime.localeCompare(b.utcTime);
  });
}

