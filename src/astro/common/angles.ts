export function normalizeDegrees(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function zenithFromAltitude(altitudeDeg: number): number {
  return 90 - altitudeDeg;
}

export function isNearHorizon(altitudeDeg: number, thresholdDeg = 1): boolean {
  return Math.abs(altitudeDeg) <= thresholdDeg;
}
