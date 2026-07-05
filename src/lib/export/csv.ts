import type { EventResult, ExportMetadata, ResultRow } from "../../types";
import type { Translator } from "../../i18n";
import { sortResultRows } from "../results/sort";
import { eventRows, formatCellValue, metadataRows, resultColumns } from "./columns";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function row(values: string[]): string {
  return values.map(escapeCsv).join(",");
}

export function exportCsv(rows: ResultRow[], events: EventResult[], metadata: ExportMetadata, t: Translator): string {
  const sortedRows = sortResultRows(rows);
  const lines: string[] = [];

  lines.push(row([t("metadataSection")]));
  for (const [label, value] of metadataRows(metadata, t)) {
    lines.push(row([label, value]));
  }

  lines.push("");
  lines.push(row([t("results")]));
  lines.push(row(resultColumns.map((column) => t(column.labelKey))));
  for (const result of sortedRows) {
    lines.push(row(resultColumns.map((column) => formatCellValue(result[column.key], t, 6))));
  }

  lines.push("");
  lines.push(row([t("eventsSection")]));
  lines.push(row([
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
  ]));
  for (const event of eventRows(events, t)) {
    lines.push(row(event));
  }

  return `\uFEFF${lines.join("\n")}`;
}
