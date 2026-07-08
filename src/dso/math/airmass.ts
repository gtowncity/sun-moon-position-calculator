import { degToRad } from "./angles";

export function airmassApprox(altitudeDeg: number): number | null {
  if (!Number.isFinite(altitudeDeg) || altitudeDeg <= 0) return null;
  return 1 / Math.sin(degToRad(altitudeDeg));
}
