import ExcelJS from "exceljs";
import { messierCatalog } from "../catalog/messierCatalog";
import type { DsoInterval, DsoNightPlan, DsoPlan, DsoWindow } from "../types";
import { formatMinutesCompact, joinReasons } from "./format";

function styleSheet(sheet: ExcelJS.Worksheet): void {
  sheet.getRow(1).font = { bold: true };
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE1E7E9" } },
        left: { style: "thin", color: { argb: "FFE1E7E9" } },
        bottom: { style: "thin", color: { argb: "FFE1E7E9" } },
        right: { style: "thin", color: { argb: "FFE1E7E9" } }
      };
    });
  });
}

function addOverview(workbook: ExcelJS.Workbook, plan: DsoPlan): void {
  const sheet = workbook.addWorksheet("Overview", { views: [{ showGridLines: false }] });
  sheet.columns = [{ width: 34 }, { width: 110 }];
  sheet.addRow(["Key", "Value"]);
  [
    ["Generated UTC", plan.generatedAtUtc],
    ["Object", `${plan.object.id} ${plan.object.primaryName}`],
    ["Location", plan.settings.locationName],
    ["Timezone", plan.settings.timeZone],
    ["Setup", plan.settings.setupProfile.name],
    ["Quality profile", plan.settings.qualityProfile.name],
    ["Interval", `${plan.settings.intervalMinutes} min`],
    ["MAIN total", formatMinutesCompact(plan.totals.mainMinutes)],
    ["EXTRA total", formatMinutesCompact(plan.totals.extraMinutes)],
    ["TEST total", formatMinutesCompact(plan.totals.testMinutes)],
    ["Effective total", formatMinutesCompact(plan.totals.effectiveMinutes)],
    ["No weather", "Score evaluates Sun, Moon and target altitude only."]
  ].forEach((row) => sheet.addRow(row));
  styleSheet(sheet);
}

function addNightPlans(workbook: ExcelJS.Workbook, nights: DsoNightPlan[]): void {
  const sheet = workbook.addWorksheet("Night Plans", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.addRow([
    "nightLabel", "rating", "astronomicalNightStart", "astronomicalNightEnd", "targetCulminationTime",
    "targetMaxAltitudeDeg", "timeAbove30", "timeAbove40", "mainDuration", "extraDuration", "testDuration",
    "effectiveDuration", "bestWindowStart", "bestWindowEnd", "reasons", "warnings"
  ]);
  nights.forEach((night) => sheet.addRow([
    night.nightLabel,
    night.overallNightRating,
    night.astronomicalNightStart ?? "",
    night.astronomicalNightEnd ?? "",
    night.targetCulminationTime ?? "",
    night.targetMaxAltitudeDeg,
    night.timeAbove30,
    night.timeAbove40,
    night.mainDuration,
    night.extraDuration,
    night.testDuration,
    night.effectiveDuration,
    night.bestWindowStart ?? "",
    night.bestWindowEnd ?? "",
    joinReasons(night.mainReasons),
    joinReasons(night.mainWarnings)
  ]));
  sheet.columns = sheet.getRow(1).values.toString().split(",").map(() => ({ width: 24 }));
  styleSheet(sheet);
}

function addWindows(workbook: ExcelJS.Workbook, windows: DsoWindow[], sheetName: string): void {
  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.addRow([
    "nightLabel", "objectId", "objectName", "category", "startLocal", "endLocal", "duration", "effectiveDuration",
    "avgScore", "minScore", "maxScore", "avgTargetAltitude", "maxTargetAltitude", "avgSunAltitude",
    "moonIllumination", "avgMoonAltitude", "avgMoonDistance", "selectedForTarget", "reasons", "warnings"
  ]);
  windows.forEach((window) => sheet.addRow([
    window.nightLabel,
    window.objectId,
    window.objectName,
    window.category,
    window.startLocal,
    window.endLocal,
    window.durationMinutes,
    window.effectiveDurationMinutes,
    window.averageScore,
    window.minScore,
    window.maxScore,
    window.averageTargetAltitude,
    window.maxTargetAltitude,
    window.averageSunAltitude,
    window.averageMoonIllumination,
    window.averageMoonAltitude,
    window.averageMoonDistance,
    window.selectedForTarget ? "yes" : "",
    joinReasons(window.reasonsSummary),
    joinReasons(window.warningsSummary)
  ]));
  sheet.columns = sheet.getRow(1).values.toString().split(",").map(() => ({ width: 24 }));
  styleSheet(sheet);
}

function addDetailedIntervals(workbook: ExcelJS.Workbook, intervals: DsoInterval[]): void {
  const sheet = workbook.addWorksheet("Detailed Intervals", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.addRow([
    "nightLabel", "localDateTime", "utcDateTime", "score", "category", "effectiveWeight", "sunAltitude",
    "moonIllumination", "moonAltitude", "moonDistance", "moonState", "targetAltitude", "targetAzimuth",
    "airmass", "targetHourAngle", "reasons", "warnings"
  ]);
  intervals.forEach((interval) => sheet.addRow([
    interval.nightLabel,
    interval.localDateTime,
    interval.utcDateTime,
    interval.finalDsoScore,
    interval.category,
    interval.effectiveWeight,
    interval.sunAltitudeDeg,
    interval.moonIlluminationPercent,
    interval.moonAltitudeDeg,
    interval.angularSeparationMoonTargetDeg,
    interval.moonState,
    interval.targetAltitudeDeg,
    interval.targetAzimuthDeg,
    interval.targetAirmassApprox ?? "",
    interval.targetHourAngle ?? "",
    joinReasons(interval.reasons),
    joinReasons(interval.warnings)
  ]));
  sheet.columns = sheet.getRow(1).values.toString().split(",").map(() => ({ width: 24 }));
  styleSheet(sheet);
}

function addObjectProfile(workbook: ExcelJS.Workbook, plan: DsoPlan): void {
  const sheet = workbook.addWorksheet("Object Profile", { views: [{ showGridLines: false }] });
  sheet.columns = [{ width: 34 }, { width: 100 }];
  const object = plan.object;
  sheet.addRow(["Key", "Value"]);
  [
    ["id", object.id],
    ["name", object.primaryName],
    ["aliases", object.aliases.join(", ")],
    ["type", object.objectType],
    ["RA hours", object.raHours],
    ["Dec deg", object.decDeg],
    ["visualMagnitude", object.visualMagnitude ?? ""],
    ["sizeArcMin", object.apparentSizeArcMin ?? ""],
    ["moonSensitivity", object.planningProfile.moonSensitivity],
    ["twilightSensitivity", object.planningProfile.twilightSensitivity],
    ["altitudeSensitivity", object.planningProfile.altitudeSensitivity],
    ["difficulty", object.planningProfile.broadbandDifficulty],
    ["notes", [...(object.notes ?? []), ...object.planningProfile.notes].join("; ")]
  ].forEach((row) => sheet.addRow(row));
  styleSheet(sheet);
}

function addSunEvents(workbook: ExcelJS.Workbook, nights: DsoNightPlan[]): void {
  const sheet = workbook.addWorksheet("Sun Events", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.addRow(["nightLabel", "astronomicalNightStart", "astronomicalNightEnd", "minSunAltitude"]);
  nights.forEach((night) => sheet.addRow([
    night.nightLabel,
    night.astronomicalNightStart ?? "",
    night.astronomicalNightEnd ?? "",
    Math.min(...night.intervals.map((interval) => interval.sunAltitudeDeg))
  ]));
  sheet.columns = [{ width: 26 }, { width: 24 }, { width: 24 }, { width: 20 }];
  styleSheet(sheet);
}

function addMoonEvents(workbook: ExcelJS.Workbook, nights: DsoNightPlan[]): void {
  const sheet = workbook.addWorksheet("Moon Events", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.addRow(["nightLabel", "averageIllumination", "maxMoonAltitude", "minMoonDistance", "dominantMoonState"]);
  nights.forEach((night) => {
    const states = new Map<string, number>();
    for (const interval of night.intervals) states.set(interval.moonState, (states.get(interval.moonState) ?? 0) + 1);
    const dominant = [...states.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    sheet.addRow([
      night.nightLabel,
      night.intervals.reduce((total, interval) => total + interval.moonIlluminationPercent, 0) / Math.max(1, night.intervals.length),
      Math.max(...night.intervals.map((interval) => interval.moonAltitudeDeg)),
      Math.min(...night.intervals.map((interval) => interval.angularSeparationMoonTargetDeg)),
      dominant
    ]);
  });
  sheet.columns = [{ width: 26 }, { width: 24 }, { width: 20 }, { width: 20 }, { width: 22 }];
  styleSheet(sheet);
}

function addTargetEvents(workbook: ExcelJS.Workbook, nights: DsoNightPlan[]): void {
  const sheet = workbook.addWorksheet("Target Events", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.addRow([
    "nightLabel", "firstAboveHorizon", "lastAboveHorizon", "culmination", "maxAltitude",
    "timeAbove20", "timeAbove25", "timeAbove30", "timeAbove35", "timeAbove40", "timeAbove45", "timeAbove60"
  ]);
  nights.forEach((night) => sheet.addRow([
    night.nightLabel,
    night.targetFirstAboveHorizon ?? "",
    night.targetLastAboveHorizon ?? "",
    night.targetCulminationTime ?? "",
    night.targetMaxAltitudeDeg,
    night.timeAbove20,
    night.timeAbove25,
    night.timeAbove30,
    night.timeAbove35,
    night.timeAbove40,
    night.timeAbove45,
    night.timeAbove60
  ]));
  sheet.columns = sheet.getRow(1).values.toString().split(",").map(() => ({ width: 22 }));
  styleSheet(sheet);
}

function addMessierCatalog(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet("Messier Catalog", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.addRow([
    "id", "name", "type", "constellation", "raHours", "decDeg", "magnitude", "sizeArcMin",
    "difficulty", "moonSensitivity", "twilightSensitivity", "notes"
  ]);
  messierCatalog.forEach((object) => sheet.addRow([
    object.id,
    object.primaryName,
    object.objectType,
    object.constellation,
    object.raHours,
    object.decDeg,
    object.visualMagnitude ?? "",
    object.apparentSizeArcMin ?? "",
    object.planningProfile.broadbandDifficulty,
    object.planningProfile.moonSensitivity,
    object.planningProfile.twilightSensitivity,
    [...(object.notes ?? []), ...object.planningProfile.notes].join("; ")
  ]));
  sheet.columns = sheet.getRow(1).values.toString().split(",").map(() => ({ width: 22 }));
  styleSheet(sheet);
}

function addSettings(workbook: ExcelJS.Workbook, plan: DsoPlan): void {
  const sheet = workbook.addWorksheet("Settings", { views: [{ showGridLines: false }] });
  sheet.columns = [{ width: 34 }, { width: 100 }];
  sheet.addRow(["Key", "Value"]);
  [
    ["dateRange", `${plan.settings.startDate} - ${plan.settings.endDate}`],
    ["weekendOnly", String(plan.settings.weekendOnly)],
    ["forcedDates", plan.settings.exceptions.forceInclude.join(", ")],
    ["excludedDates", plan.settings.exceptions.exclude.join(", ")],
    ["bortle", plan.settings.bortle ?? ""],
    ["sqm", plan.settings.sqm ?? ""],
    ["mode", plan.settings.mode],
    ["targetEffectiveHours", plan.settings.targetEffectiveHours ?? ""]
  ].forEach((row) => sheet.addRow(row));
  styleSheet(sheet);
}

export async function exportDsoXlsx(plan: DsoPlan): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "solar-lunar-position-tool dso-planner";
  workbook.created = new Date(plan.generatedAtUtc);
  const intervals = plan.nights.flatMap((night) => night.intervals);
  const windows = plan.nights.flatMap((night) => night.windows);

  addOverview(workbook, plan);
  addNightPlans(workbook, plan.nights);
  addWindows(workbook, plan.recommendedWindows, "Recommended Windows");
  addDetailedIntervals(workbook, intervals);
  addSunEvents(workbook, plan.nights);
  addMoonEvents(workbook, plan.nights);
  addTargetEvents(workbook, plan.nights);
  addObjectProfile(workbook, plan);
  addSettings(workbook, plan);
  addMessierCatalog(workbook);
  addWindows(workbook, windows, "All Windows");

  return workbook.xlsx.writeBuffer();
}
