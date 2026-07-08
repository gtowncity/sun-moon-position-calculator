import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { defaultDsoSetupProfile, qualityProfileById } from "../src/dso/catalog/objectProfiles";
import { exportDsoMarkdown } from "../src/dso/export/exportDsoMarkdown";
import { exportDsoText } from "../src/dso/export/exportDsoText";
import { exportDsoXlsx } from "../src/dso/export/exportDsoXlsx";
import { generateDsoPlan } from "../src/dso/planner/generateDsoPlan";

function makePlan() {
  return generateDsoPlan({
    location: { latitude: 52.52, longitude: 13.405, elevationMeters: 34 },
    locationName: "Berlin",
    timeZone: "Europe/Berlin",
    startDate: "2026-09-11",
    endDate: "2026-09-11",
    weekendOnly: false,
    exceptions: { forceInclude: [], exclude: [] },
    intervalMinutes: 60,
    objectId: "M31",
    setupProfile: defaultDsoSetupProfile,
    qualityProfile: qualityProfileById("normal"),
    mode: "range",
    bortle: 4.6,
    sqm: 21
  });
}

describe("DSO exports", () => {
  it("exports readable text and markdown summaries", () => {
    const plan = makePlan();

    expect(exportDsoText(plan)).toContain("DSO Planner - M31");
    expect(exportDsoMarkdown(plan)).toContain("## Best Aufnahmefenster");
  });

  it("exports DSO XLSX sheets", async () => {
    const buffer = await exportDsoXlsx(makePlan());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Overview",
      "Night Plans",
      "Recommended Windows",
      "Detailed Intervals",
      "Sun Events",
      "Moon Events",
      "Target Events",
      "Object Profile",
      "Settings",
      "Messier Catalog",
      "All Windows"
    ]);
  });
});
