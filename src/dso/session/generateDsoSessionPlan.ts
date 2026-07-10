import { Temporal } from "@js-temporal/polyfill";
import { generateDsoPlan } from "../planner/generateDsoPlan";
import { enumerateNightStartDates } from "../planner/weekendFilter";
import type { DsoNightPlan, DsoPlannerSettings } from "../types";
import { allocateSessionWindows, type AllocationInput, markAllCandidateWindows } from "./sessionAllocation";
import { buildSessionCalendarDays } from "./calendarState";
import type { SessionPlan, SessionPlannerRequest, SessionTarget, SessionTargetPlan } from "./sessionTypes";

function enabledTargets(targets: SessionTarget[]): SessionTarget[] {
  return targets.filter((target) => target.enabled);
}

function effectiveHoursForTarget(
  target: SessionTarget,
  targets: SessionTarget[],
  request: SessionPlannerRequest
): number {
  if (request.allocationMode === "equal") {
    return request.totalTargetEffectiveHours / Math.max(1, targets.length);
  }
  return Math.max(0, target.targetEffectiveHours);
}

function settingsForTarget(baseSettings: DsoPlannerSettings, target: SessionTarget, targetEffectiveHours: number): DsoPlannerSettings {
  return {
    ...baseSettings,
    objectId: target.objectId,
    mode: "range",
    targetEffectiveHours
  };
}

function collectNightsByDate(plans: SessionTargetPlan[]): Map<string, DsoNightPlan[]> {
  const map = new Map<string, DsoNightPlan[]>();
  for (const targetPlan of plans) {
    for (const night of targetPlan.plan.nights) {
      const nights = map.get(night.dateStart) ?? [];
      nights.push(night);
      map.set(night.dateStart, nights);
    }
  }
  return map;
}

export function generateDsoSessionPlan(request: SessionPlannerRequest): SessionPlan {
  const targets = enabledTargets(request.targets);
  if (targets.length === 0) {
    throw new Error("Mindestens ein aktives Session-Ziel ist erforderlich.");
  }

  const allocationInputs: AllocationInput[] = targets.map((target) => {
    const targetHours = effectiveHoursForTarget(target, targets, request);
    const plan = generateDsoPlan(settingsForTarget(request.baseSettings, target, targetHours));
    return {
      target,
      object: plan.object,
      windows: plan.nights.flatMap((night) => night.windows),
      targetEffectiveMinutes: Math.max(0, targetHours * 60)
    };
  });

  const allocated = allocateSessionWindows(allocationInputs, request.calendarOverrides);
  const combinedWindows = markAllCandidateWindows(allocationInputs, allocated, request.calendarOverrides);
  const allocatedByTargetId = new Map(allocated.map((entry) => [entry.target.id, entry]));

  const objectPlans: SessionTargetPlan[] = allocationInputs.map((input) => {
    const targetHours = input.targetEffectiveMinutes / 60;
    const plan = generateDsoPlan(settingsForTarget(request.baseSettings, input.target, targetHours));
    const allocatedEntry = allocatedByTargetId.get(input.target.id);
    const effectiveDurationMinutes = allocatedEntry?.effectiveDurationMinutes ?? 0;
    const realDurationMinutes = allocatedEntry?.realDurationMinutes ?? 0;
    return {
      target: input.target,
      object: input.object,
      plan,
      targetEffectiveMinutes: input.targetEffectiveMinutes,
      selectedWindows: allocatedEntry?.selectedWindows ?? [],
      effectiveDurationMinutes,
      realDurationMinutes,
      reached: effectiveDurationMinutes >= input.targetEffectiveMinutes,
      remainingEffectiveMinutes: Math.max(0, input.targetEffectiveMinutes - effectiveDurationMinutes)
    };
  });

  const dates = enumerateNightStartDates(request.baseSettings.startDate, request.baseSettings.endDate);
  const calendarDays = buildSessionCalendarDays(
    dates,
    collectNightsByDate(objectPlans),
    combinedWindows,
    request.calendarOverrides
  );
  const countedWindows = combinedWindows.filter((window) => window.includeInTotals);
  const plannedEffectiveMinutes = countedWindows.reduce((total, window) => total + window.effectiveDurationMinutes, 0);
  const realDurationMinutes = countedWindows.reduce((total, window) => total + window.durationMinutes, 0);
  const targetEffectiveMinutes = objectPlans.reduce((total, entry) => total + entry.targetEffectiveMinutes, 0);

  return {
    generatedAtUtc: Temporal.Now.instant().toString(),
    allocationMode: request.allocationMode,
    targets,
    objectPlans,
    combinedWindows,
    calendarDays,
    totals: {
      targetEffectiveMinutes,
      plannedEffectiveMinutes,
      realDurationMinutes,
      selectedWindowCount: countedWindows.length,
      selectedNightCount: new Set(countedWindows.map((window) => window.dateStart)).size,
      reached: plannedEffectiveMinutes >= targetEffectiveMinutes
    },
    warnings: [...new Set(objectPlans.flatMap((entry) => entry.plan.warnings))].slice(0, 12)
  };
}
