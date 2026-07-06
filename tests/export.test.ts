import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { getTranslator } from "../src/i18n";
import { exportMarkdown } from "../src/lib/export/markdown";
import { exportTxt } from "../src/lib/export/txt";
import { exportXlsx } from "../src/lib/export/xlsx";
import { makeEvents, makeMetadata, makeRow } from "./helpers";

const rows = [
  makeRow("moon", "2026-07-03T12:15:00Z", 4),
  makeRow("sun", "2026-07-03T12:15:00Z", 3),
  makeRow("sun", "2026-07-03T12:00:00Z", 1),
  makeRow("moon", "2026-07-03T12:00:00Z", 2)
];
const events = makeEvents();
const metadata = makeMetadata();

describe("exports", () => {
  it("exports TXT sorted by body and UTC time", () => {
    const txt = exportTxt(rows, events, metadata, getTranslator("en"));

    expect(txt).toContain("Local date");
    expect(txt.search(/Sun\s+2026-07-03/)).toBeLessThan(txt.search(/Moon\s+2026-07-03/));
    expect(txt).toContain("Full moon");
  });

  it("exports a valid Markdown report", () => {
    const markdown = exportMarkdown(rows, events, metadata, getTranslator("en"));

    expect(markdown).toContain("## Metadata");
    expect(markdown).toContain("| Index | Object |");
    expect(markdown).toContain("## Events");
  });

  it("exports an XLSX workbook with required sheets", async () => {
    const buffer = await exportXlsx(rows, events, metadata, getTranslator("en"));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Results", "Metadata", "Events", "ValidationInfo"]);
    expect(workbook.getWorksheet("Metadata")?.getCell("A2").value).toBe("App version");
    expect(workbook.getWorksheet("Results")?.getCell("A2").value).toBe("1.000000");
    expect(workbook.getWorksheet("Events")?.getCell("A2").value).toBe("Sun");
  });
});
