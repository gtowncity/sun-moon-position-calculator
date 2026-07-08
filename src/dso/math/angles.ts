export function degToRad(deg: number): number {
  return deg * Math.PI / 180;
}

export function radToDeg(rad: number): number {
  return rad * 180 / Math.PI;
}

export function normalizeDegrees(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function normalizeSignedDegrees(value: number): number {
  const normalized = normalizeDegrees(value);
  return normalized > 180 ? normalized - 360 : normalized;
}

export function angularSeparationDeg(ra1Deg: number, dec1Deg: number, ra2Deg: number, dec2Deg: number): number {
  const ra1 = degToRad(ra1Deg);
  const ra2 = degToRad(ra2Deg);
  const dec1 = degToRad(dec1Deg);
  const dec2 = degToRad(dec2Deg);
  const sinDDec = Math.sin((dec2 - dec1) / 2);
  const sinDRa = Math.sin((ra2 - ra1) / 2);
  const a = sinDDec * sinDDec + Math.cos(dec1) * Math.cos(dec2) * sinDRa * sinDRa;
  return radToDeg(2 * Math.asin(Math.min(1, Math.sqrt(Math.max(0, a)))));
}
