import type { DsoPlan } from "../types";
import { formatMinutesCompact, formatNumber, joinReasons } from "./format";

export function exportDsoText(plan: DsoPlan): string {
  const lines: string[] = [];
  lines.push(`DSO Planner - ${plan.object.id} ${plan.object.primaryName}`);
  lines.push("=".repeat(lines[0].length));
  lines.push("");
  lines.push(`Location: ${plan.settings.locationName} (${plan.settings.timeZone})`);
  lines.push(`Setup: ${plan.settings.setupProfile.name}`);
  lines.push(`Quality: ${plan.settings.qualityProfile.name}`);
  lines.push(`Interval: ${plan.settings.intervalMinutes} min`);
  lines.push(`MAIN total: ${formatMinutesCompact(plan.totals.mainMinutes)}`);
  lines.push(`Effective total: ${formatMinutesCompact(plan.totals.effectiveMinutes)}`);

  if (plan.targetHoursPlan) {
    lines.push("");
    lines.push("Target effective integration");
    lines.push(`Target: ${formatMinutesCompact(plan.targetHoursPlan.targetEffectiveMinutes)}`);
    lines.push(`Reached: ${plan.targetHoursPlan.reached ? "yes" : "no"}`);
    lines.push(`Real time: ${formatMinutesCompact(plan.targetHoursPlan.realDurationMinutes)}`);
    lines.push(`Effective time: ${formatMinutesCompact(plan.targetHoursPlan.effectiveDurationMinutes)}`);
    lines.push(`Remaining: ${formatMinutesCompact(plan.targetHoursPlan.remainingEffectiveMinutes)}`);
  }

  lines.push("");
  lines.push("Best nights");
  for (const night of [...plan.nights].sort((a, b) => b.effectiveDuration - a.effectiveDuration).slice(0, 12)) {
    lines.push(`${night.nightLabel}: ${night.overallNightRating}, MAIN ${formatMinutesCompact(night.mainDuration)}, effective ${formatMinutesCompact(night.effectiveDuration)}, best ${night.bestWindowStart ?? "-"}-${night.bestWindowEnd ?? "-"}, max altitude ${formatNumber(night.targetMaxAltitudeDeg)} deg.`);
    if (night.mainWarnings.length) lines.push(`  Warnings: ${joinReasons(night.mainWarnings.slice(0, 3))}`);
  }

  lines.push("");
  lines.push("Recommended windows");
  for (const window of plan.recommendedWindows.slice(0, 40)) {
    lines.push(`${window.nightLabel} | ${window.category} | ${window.startLocal}-${window.endLocal} | ${formatMinutesCompact(window.durationMinutes)} real / ${formatMinutesCompact(window.effectiveDurationMinutes)} effective | score ${formatNumber(window.averageScore, 0)} | target ${formatNumber(window.averageTargetAltitude)} deg | Moon ${formatNumber(window.averageMoonIllumination, 0)}%, distance ${formatNumber(window.averageMoonDistance, 0)} deg`);
    if (window.warningsSummary.length) lines.push(`  Warnings: ${joinReasons(window.warningsSummary)}`);
  }

  lines.push("");
  lines.push("Object profile");
  lines.push(`${plan.object.id} ${plan.object.primaryName} (${plan.object.objectType})`);
  lines.push(`RA/Dec J2000: ${formatNumber(plan.object.raHours, 3)}h, ${formatNumber(plan.object.decDeg, 2)} deg`);
  lines.push(`Moon sensitivity: ${formatNumber(plan.object.planningProfile.moonSensitivity, 2)}, twilight sensitivity: ${formatNumber(plan.object.planningProfile.twilightSensitivity, 2)}, difficulty: ${plan.object.planningProfile.broadbandDifficulty}`);
  for (const note of [...(plan.object.notes ?? []), ...plan.object.planningProfile.notes].slice(0, 6)) {
    lines.push(`- ${note}`);
  }

  lines.push("");
  lines.push("Limits: astronomical planning only; no weather, clouds, transparency, focus, guiding or real frame-quality evaluation is included.");
  return lines.join("\n");
}
