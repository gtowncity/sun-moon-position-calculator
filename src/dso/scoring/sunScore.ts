import type { PlanningProfile, TwilightClass } from "../types";

function interpolateScore(altitudeDeg: number): number {
  const points = [
    { altitude: -18.0, score: 100 },
    { altitude: -17.8, score: 95 },
    { altitude: -17.5, score: 85 },
    { altitude: -17.3, score: 75 },
    { altitude: -17.0, score: 65 },
    { altitude: -16.5, score: 35 },
    { altitude: -15.0, score: 15 },
    { altitude: -12.0, score: 5 },
    { altitude: 0, score: 0 }
  ];

  if (altitudeDeg <= points[0].altitude) return points[0].score;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    if (altitudeDeg >= current.altitude && altitudeDeg <= next.altitude) {
      const ratio = (altitudeDeg - current.altitude) / (next.altitude - current.altitude);
      return current.score + (next.score - current.score) * ratio;
    }
  }
  return 0;
}

export function twilightClassForSunAltitude(sunAltitudeDeg: number): TwilightClass {
  if (sunAltitudeDeg > 0) return "daylight";
  if (sunAltitudeDeg > -6) return "civil_twilight";
  if (sunAltitudeDeg > -12) return "nautical_twilight";
  if (sunAltitudeDeg > -18) return "astronomical_twilight";
  return "astronomical_night";
}

export function calculateSunScore(sunAltitudeDeg: number, profile: PlanningProfile): number {
  const base = interpolateScore(sunAltitudeDeg);
  const twilightPenalty = (100 - base) * profile.twilightSensitivity;
  const tolerantFloor = profile.surfaceBrightnessClass === "high" ? 8 : 0;
  return Math.round(Math.max(tolerantFloor, 100 - twilightPenalty));
}
