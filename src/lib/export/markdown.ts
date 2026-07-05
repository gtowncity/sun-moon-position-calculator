import type { EventResult, ExportMetadata, ResultRow } from "../../types";
import type { Translator } from "../../i18n";
import { sortResultRows } from "../results/sort";
import { eventRows, formatCellValue, metadataRows, resultColumns } from "./columns";

function escapeMarkdownCell(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function markdownTable(headers: string[], rows: string[][]): string {
  const header = `| ${headers.map(escapeMarkdownCell).join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(escapeMarkdownCell).join(" | ")} |`);
  return [header, separator, ...body].join("\n");
}

export function exportMarkdown(rows: ResultRow[], events: EventResult[], metadata: ExportMetadata, t: Translator): string {
  const sortedRows = sortResultRows(rows);
  const metadataBlock = metadataRows(metadata, t).map(([label, value]) => `- **${label}:** ${value}`);
  const resultTable = markdownTable(
    resultColumns.map((column) => t(column.labelKey)),
    sortedRows.map((row) => resultColumns.map((column) => formatCellValue(row[column.key], t)))
  );
  const eventsTable = markdownTable(
    [
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
    ],
    eventRows(events, t)
  );

  return [
    `# ${t("reportTitle")}`,
    "",
    `## ${t("metadataSection")}`,
    ...metadataBlock,
    "",
    `## ${t("eventsSection")}`,
    eventsTable,
    "",
    `## ${t("results")}`,
    resultTable,
    "",
    `## ${t("algorithmNotes")}`,
    metadata.accuracyNote
  ].join("\n");
}
