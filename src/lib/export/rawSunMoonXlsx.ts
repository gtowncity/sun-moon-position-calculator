import ExcelJS from "exceljs";
import type { CalculationFormState } from "../../domain/calculationRequest";
import type { RawSunMoonRow } from "../../domain/astroCalculator";
import { buildRawSunMoonRows } from "../../domain/astroCalculator";

const EXCEL_ROW_LIMIT = 1_048_000;

const columns: Array<{ header: string; key: keyof RawSunMoonRow; width: number }> = [
  { header: "Index", key: "index", width: 10 },
  { header: "Standort", key: "locationLabel", width: 24 },
  { header: "Breite", key: "latitudeDeg", width: 14 },
  { header: "Laenge", key: "longitudeDeg", width: 14 },
  { header: "Hoehe Meter", key: "elevationMeters", width: 14 },
  { header: "Lokale Zeit", key: "localDateTime", width: 20 },
  { header: "Objekt", key: "object", width: 12 },
  { header: "Azimut Grad", key: "azimuthDeg", width: 16 },
  { header: "Hoehe scheinbar Grad", key: "altitudeDegApparent", width: 22 },
  { header: "Hoehe geometrisch Grad", key: "altitudeDegGeometric", width: 24 },
  { header: "Zenit scheinbar Grad", key: "zenithDegApparent", width: 22 },
  { header: "Mond Distanz km", key: "distanceKm", width: 18 },
  { header: "Mond Beleuchtung Prozent", key: "illuminationPercent", width: 24 }
];

function safeSheetValue(value: RawSunMoonRow[keyof RawSunMoonRow]): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? Number(value.toFixed(8)) : "";
  return String(value);
}

function safeFilenamePart(value: string): string {
  return value.trim().replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "") || "standort";
}

export function rawSunMoonFilename(form: CalculationFormState): string {
  return `sonne-mond-rohdaten-${safeFilenamePart(form.locationLabel)}-${form.date}-bis-${form.endDate}-1min.xlsx`;
}

export async function exportRawSunMoonXlsx(form: CalculationFormState): Promise<ArrayBuffer> {
  const rows = buildRawSunMoonRows(form);

  if (rows.length > EXCEL_ROW_LIMIT) {
    throw new Error("Der Zeitraum ist fuer einen 1-Minuten-Export zu lang.");
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "solar-lunar-position-tool";
  workbook.created = new Date();

  const results = workbook.addWorksheet("Rohdaten_1min", { views: [{ state: "frozen", ySplit: 1 }] });
  results.columns = columns;
  rows.forEach((row) => {
    results.addRow(Object.fromEntries(columns.map((column) => [column.key, safeSheetValue(row[column.key])])));
  });
  results.getRow(1).font = { bold: true };
  results.autoFilter = {
    from: "A1",
    to: `${results.getColumn(columns.length).letter}1`
  };

  const meta = workbook.addWorksheet("Metadata");
  meta.columns = [{ width: 28 }, { width: 80 }];
  meta.addRows([
    ["Standort", form.locationLabel],
    ["Breite", form.latitudeDeg],
    ["Laenge", form.longitudeDeg],
    ["Hoehe Meter", form.elevationMeters],
    ["Start lokal", `${form.date} ${form.time}`],
    ["Ende lokal", `${form.endDate} ${form.endTime}`],
    ["Intervall Minuten", "1"],
    ["Objekte", "Sonne und Mond"],
    ["Zeilen", String(rows.length)],
    ["Hinweis", "Separater Rohdatenexport; die Vorschau-/Tabellenintervall-Auswahl bleibt unveraendert."]
  ]);
  meta.getRow(1).font = { bold: true };

  return workbook.xlsx.writeBuffer();
}
