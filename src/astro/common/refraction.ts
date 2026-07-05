import type { RefractionMode, RefractionSettings } from "../../domain/types";

export const standardPressureHpa = 1013.25;
export const standardTemperatureC = 15;

export function normalizeRefractionSettings(settings?: Partial<RefractionSettings>): RefractionSettings {
  return {
    mode: settings?.mode ?? "standard",
    pressureHpa: Number.isFinite(settings?.pressureHpa) ? Number(settings?.pressureHpa) : standardPressureHpa,
    temperatureC: Number.isFinite(settings?.temperatureC) ? Number(settings?.temperatureC) : standardTemperatureC
  };
}

export function validateRefractionMode(value: string): value is RefractionMode {
  return value === "none" || value === "standard" || value === "custom";
}

export function bennettRefractionDegrees(
  geometricAltitudeDeg: number,
  pressureHpa = standardPressureHpa,
  temperatureC = standardTemperatureC
): number {
  if (!Number.isFinite(geometricAltitudeDeg) || geometricAltitudeDeg < -1 || geometricAltitudeDeg >= 90) {
    return 0;
  }

  const angle = (geometricAltitudeDeg + 10.3 / (geometricAltitudeDeg + 5.11)) * Math.PI / 180;
  const correctionArcMinutes = 1.02 / Math.tan(angle);
  const pressureScale = pressureHpa / 1010;
  const temperatureScale = 283 / (273 + temperatureC);
  const correctionDeg = (correctionArcMinutes / 60) * pressureScale * temperatureScale;

  return Number.isFinite(correctionDeg) && correctionDeg > 0 ? correctionDeg : 0;
}

export function applyCustomRefraction(geometricAltitudeDeg: number, settings: RefractionSettings): number {
  if (settings.mode === "none") {
    return geometricAltitudeDeg;
  }

  return geometricAltitudeDeg + bennettRefractionDegrees(
    geometricAltitudeDeg,
    settings.pressureHpa,
    settings.temperatureC
  );
}
