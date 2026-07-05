import ExcelJS from "exceljs";
import type { EventResult, ExportMetadata, ResultRow } from "../../types";
import type { Translator } from "../../i18n";
import { sortResultRows } from "../results/sort";
import { eventRows, formatCellValue, metadataRows, resultColumns } from "./columns";

function styleWorksheet(worksheet: ExcelJS.Worksheet): void {
  worksheet.eachRow((row) => {
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

function addMetadataSheet(workbook: ExcelJS.Workbook, metadata: ExportMetadata, t: Translator): void {
  const sheet = workbook.addWorksheet("Metadata", { views: [{ showGridLines: false }] });
  sheet.columns = [{ width: 32 }, { width: 100 }];
  sheet.getRow(1).values = [t("metadataKey"), t("metadataValue")];
  sheet.getRow(1).font = { bold: true };
  metadataRows(metadata, t).forEach(([label, value], index) => {
    sheet.getRow(index + 2).values = [label, value];
  });
  styleWorksheet(sheet);
}

function addResultsSheet(workbook: ExcelJS.Workbook, rows: ResultRow[], t: Translator): void {
  const sheet = workbook.addWorksheet("Results", { views: [{ state: "frozen", ySplit: 1 }] });
  const sortedRows = sortResultRows(rows);
  sheet.addTable({
    name: "PositionResults",
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: resultColumns.map((column) => ({ name: t(column.labelKey), filterButton: true })),
    rows: sortedRows.map((row) => resultColumns.map((column) => formatCellValue(row[column.key], t, 6)))
  });
  sheet.columns = resultColumns.map(() => ({ width: 22 }));
  styleWorksheet(sheet);
}

function addEventsSheet(workbook: ExcelJS.Workbook, events: EventResult[], t: Translator): void {
  const sheet = workbook.addWorksheet("Events", { views: [{ state: "frozen", ySplit: 1 }] });
  const headers = [
    t("columnBody"),
    t("columnEvent"),
    t("columnStatus"),
    t("columnLocalDate"),
    t("columnLocalTime"),
    t("columnUtcTime"),
    t("columnAzimuthDeg"),
    t("columnApparentAltitudeDeg"),
    t("columnGeometricAltitudeDeg"),
    t("columnWarnings")
  ];
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };
  eventRows(events, t).forEach((row) => sheet.addRow(row));
  sheet.columns = headers.map(() => ({ width: 24 }));
  styleWorksheet(sheet);
}

function addValidationInfoSheet(workbook: ExcelJS.Workbook, metadata: ExportMetadata, t: Translator): void {
  const sheet = workbook.addWorksheet("ValidationInfo", { views: [{ showGridLines: false }] });
  sheet.columns = [{ width: 36 }, { width: 110 }];
  sheet.addRow([t("validationInfo"), metadata.accuracyNote]);
  sheet.addRow([t("metadataAlgorithm"), metadata.algorithm]);
  sheet.addRow([t("nrelSpaReference"), t("nrelSpaReferenceNote")]);
  sheet.addRow([t("jplReference"), t("jplReferenceNote")]);
  sheet.addRow([t("refractionWarning"), t("nearHorizonWarning")]);
  styleWorksheet(sheet);
}

export async function exportXlsx(rows: ResultRow[], events: EventResult[], metadata: ExportMetadata, t: Translator): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "solar-lunar-position-tool";
  workbook.created = new Date(metadata.createdAtUtc);

  addResultsSheet(workbook, rows, t);
  addMetadataSheet(workbook, metadata, t);
  addEventsSheet(workbook, events, t);
  addValidationInfoSheet(workbook, metadata, t);

  return workbook.xlsx.writeBuffer();
}
