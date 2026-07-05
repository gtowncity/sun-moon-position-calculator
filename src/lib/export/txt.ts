import type { EventResult, ExportMetadata, ResultRow } from "../../types";
import type { Translator } from "../../i18n";
import { sortResultRows } from "../results/sort";
import { eventRows, formatCellValue, metadataRows, resultColumns } from "./columns";

export function exportTxt(rows: ResultRow[], events: EventResult[], metadata: ExportMetadata, t: Translator): string {
  const sortedRows = sortResultRows(rows);
  const lines: string[] = [];

  lines.push(t("reportTitle"));
  lines.push("=".repeat(t("reportTitle").length));
  lines.push("");
  for (const [label, value] of metadataRows(metadata, t)) {
    lines.push(`${label}: ${value}`);
  }

  lines.push("");
  lines.push(t("eventsSection"));
  for (const event of eventRows(events, t)) {
    lines.push(event.join(" | "));
  }

  const table = [
    resultColumns.map((column) => t(column.labelKey)),
    ...sortedRows.map((row) => resultColumns.map((column) => formatCellValue(row[column.key], t)))
  ];
  const widths = resultColumns.map((_, columnIndex) => Math.max(...table.map((tableRow) => tableRow[columnIndex]?.length ?? 0)));

  lines.push("");
  lines.push(t("results"));
  lines.push(
    ...table.map((tableRow) => tableRow.map((cell, columnIndex) => cell.padEnd(widths[columnIndex], " ")).join("  "))
  );

  return lines.join("\n");
}
