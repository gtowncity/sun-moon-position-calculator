import type { DsoPlan } from "../types";
import { formatMinutesCompact, formatNumber, joinReasons } from "./format";

function markdownTable(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replaceAll("|", "\\|").replaceAll("\n", " ");
  return [
    `| ${headers.map(escape).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escape).join(" | ")} |`)
  ].join("\n");
}

export function exportDsoMarkdown(plan: DsoPlan): string {
  const bestNights = [...plan.nights].sort((a, b) => b.effectiveDuration - a.effectiveDuration).slice(0, 10);
  const recommended = plan.recommendedWindows.slice(0, 30);
  const target = plan.targetHoursPlan;

  return [
    `# DSO Planner - ${plan.object.id} ${plan.object.primaryName}`,
    "",
    "## Overview",
    `- Location: ${plan.settings.locationName} (${plan.settings.timeZone})`,
    `- Object: ${plan.object.id} ${plan.object.primaryName}`,
    `- Setup: ${plan.settings.setupProfile.name}`,
    `- Quality profile: ${plan.settings.qualityProfile.name}`,
    `- Interval: ${plan.settings.intervalMinutes} min`,
    `- Total MAIN time: ${formatMinutesCompact(plan.totals.mainMinutes)}`,
    `- Effective time: ${formatMinutesCompact(plan.totals.effectiveMinutes)}`,
    ...(target ? [
      `- Target: ${formatMinutesCompact(target.targetEffectiveMinutes)} effective`,
      `- Target reached: ${target.reached ? "yes" : "no"}`,
      `- Selected real time: ${formatMinutesCompact(target.realDurationMinutes)}`,
      `- Selected effective time: ${formatMinutesCompact(target.effectiveDurationMinutes)}`
    ] : []),
    "",
    "## Best Nights",
    markdownTable(
      ["Night", "Rating", "MAIN", "EXTRA", "Effective", "Best", "Max alt", "Reasons"],
      bestNights.map((night) => [
        night.nightLabel,
        night.overallNightRating,
        formatMinutesCompact(night.mainDuration),
        formatMinutesCompact(night.extraDuration),
        formatMinutesCompact(night.effectiveDuration),
        night.bestWindowStart && night.bestWindowEnd ? `${night.bestWindowStart}-${night.bestWindowEnd}` : "-",
        `${formatNumber(night.targetMaxAltitudeDeg)} deg`,
        joinReasons(night.mainReasons.slice(0, 3))
      ])
    ),
    "",
    "## Best Aufnahmefenster",
    markdownTable(
      ["Night", "Category", "Start", "End", "Duration", "Effective", "Avg score", "Avg target alt", "Moon", "Reasons", "Warnings"],
      recommended.map((window) => [
        window.nightLabel,
        window.category,
        window.startLocal,
        window.endLocal,
        formatMinutesCompact(window.durationMinutes),
        formatMinutesCompact(window.effectiveDurationMinutes),
        formatNumber(window.averageScore, 0),
        `${formatNumber(window.averageTargetAltitude)} deg`,
        `${formatNumber(window.averageMoonIllumination, 0)}%, ${formatNumber(window.averageMoonDistance, 0)} deg away`,
        joinReasons(window.reasonsSummary),
        joinReasons(window.warningsSummary)
      ])
    ),
    "",
    "## Object Profile",
    `- Type: ${plan.object.objectType}`,
    `- RA/Dec J2000: ${formatNumber(plan.object.raHours, 3)}h, ${formatNumber(plan.object.decDeg, 2)} deg`,
    `- Magnitude: ${plan.object.visualMagnitude ?? "-"}`,
    `- Size: ${plan.object.majorAxisArcMin ?? plan.object.apparentSizeArcMin ?? "-"} arcmin`,
    `- Moon sensitivity: ${formatNumber(plan.object.planningProfile.moonSensitivity, 2)}`,
    `- Twilight sensitivity: ${formatNumber(plan.object.planningProfile.twilightSensitivity, 2)}`,
    `- Difficulty: ${plan.object.planningProfile.broadbandDifficulty}`,
    ...(plan.object.notes?.length ? plan.object.notes.map((note) => `- Note: ${note}`) : []),
    "",
    "## Important Limits",
    "This is astronomical planning quality only. The score evaluates Sun, Moon and target altitude, not clouds, transparency, focus, guiding or frame quality after capture."
  ].join("\n");
}
