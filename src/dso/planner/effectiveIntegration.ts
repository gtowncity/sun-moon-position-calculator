import type { DsoTargetHoursPlan, DsoWindow } from "../types";

function windowPriority(window: DsoWindow): number {
  const categoryBonus = window.category === "MAIN" ? 10000 : window.category === "EXTRA" ? 5000 : window.category === "TEST" ? 1000 : 0;
  return categoryBonus +
    window.averageScore * 45 +
    window.averageTargetAltitude * 15 -
    Math.max(0, window.averageMoonAltitude) * 4 +
    window.durationMinutes * 0.35 -
    window.averageMoonIllumination * 3;
}

export function planTargetEffectiveIntegration(windows: DsoWindow[], targetEffectiveHours: number): DsoTargetHoursPlan {
  const targetEffectiveMinutes = Math.max(0, targetEffectiveHours * 60);
  const candidates = windows
    .filter((window) => window.category !== "BAD" && window.effectiveDurationMinutes > 0)
    .sort((a, b) => windowPriority(b) - windowPriority(a) || b.effectiveDurationMinutes - a.effectiveDurationMinutes);

  const selectedWindows: DsoWindow[] = [];
  let effectiveDurationMinutes = 0;
  let realDurationMinutes = 0;
  let mainEffectiveMinutes = 0;
  let extraEffectiveMinutes = 0;

  for (const window of candidates) {
    if (effectiveDurationMinutes >= targetEffectiveMinutes) break;
    const selected = { ...window, selectedForTarget: true };
    selectedWindows.push(selected);
    effectiveDurationMinutes += selected.effectiveDurationMinutes;
    realDurationMinutes += selected.durationMinutes;
    if (selected.category === "MAIN") mainEffectiveMinutes += selected.effectiveDurationMinutes;
    if (selected.category === "EXTRA") extraEffectiveMinutes += selected.effectiveDurationMinutes;
  }

  return {
    targetEffectiveMinutes,
    reached: effectiveDurationMinutes >= targetEffectiveMinutes,
    realDurationMinutes,
    effectiveDurationMinutes,
    mainEffectiveMinutes,
    extraEffectiveMinutes,
    selectedWindows,
    remainingEffectiveMinutes: Math.max(0, targetEffectiveMinutes - effectiveDurationMinutes)
  };
}
