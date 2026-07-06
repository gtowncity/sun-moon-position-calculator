import { useMemo, useState } from "react";
import type { ResultRow } from "../../types";
import type { Translator } from "../../i18n";
import { formatCellValue, resultColumns } from "../../lib/export/columns";
import { sortResultRows } from "../../lib/results/sort";
import { RetroDataGrid } from "../retro/RetroDataGrid";
import { ExportPanel } from "./ExportPanel";

interface ResultDataGridProps {
  rows: ResultRow[];
  focusedUtc: string | null;
  onCsv: () => void;
  onXlsx: () => void;
  onTxt: () => void;
  onMarkdown: () => void;
  t: Translator;
}

function tablePrecision(key: keyof ResultRow): number {
  if (key === "latitude" || key === "longitude") return 6;
  if (key === "distanceKm") return 3;
  if (key === "index") return 0;
  return 3;
}

export function ResultDataGrid({ rows, focusedUtc, onCsv, onXlsx, onTxt, onMarkdown, t }: ResultDataGridProps) {
  const [bodyFilter, setBodyFilter] = useState<"all" | "sun" | "moon">("all");
  const [query, setQuery] = useState("");
  const sortedRows = useMemo(() => sortResultRows(rows), [rows]);
  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sortedRows
      .filter((row) => bodyFilter === "all" || row.body === bodyFilter)
      .filter((row) => {
        if (!normalizedQuery) return true;
        return resultColumns.some((column) =>
          formatCellValue(row[column.key], t, tablePrecision(column.key)).toLowerCase().includes(normalizedQuery)
        );
      });
  }, [bodyFilter, query, sortedRows, t]);

  return (
    <section className="result-data-grid-panel">
      <div className="terminal-section-title">[{t("resultDataGrid")}]</div>
      <div className="data-grid-meta">
        <span>{t("rows")}: {rows.length}</span>
        <span>{t("columnTimeZone")}: {rows[0]?.timeZone ?? "-"}</span>
      </div>
      <ExportPanel hasRows={rows.length > 0} onCsv={onCsv} onXlsx={onXlsx} onTxt={onTxt} onMarkdown={onMarkdown} t={t} />
      <div className="table-tools terminal-table-tools" aria-label={t("tableTools")}>
        <div className="segmented compact">
          {(["all", "sun", "moon"] as const).map((body) => (
            <label key={body}>
              <input type="radio" name="body-filter" checked={bodyFilter === body} onChange={() => setBodyFilter(body)} />
              <span>{body === "all" ? t("filterAll") : t(body)}</span>
            </label>
          ))}
        </div>
        <label>
          {t("tableSearch")}
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>
      <RetroDataGrid>
        {rows.length === 0 ? <p className="empty-state">{t("noRows")}</p> : (
          <table>
            <thead>
              <tr>
                {resultColumns.map((column) => (
                  <th key={column.key} scope="col">{t(column.labelKey)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={`${row.utcTime}-${row.body}-${row.index}`} className={`${row.body}-row ${focusedUtc === row.utcTime ? "is-focused-row" : ""}`}>
                  {resultColumns.map((column) => (
                    <td key={column.key}>{formatCellValue(row[column.key], t, tablePrecision(column.key)) || t("emptyValue")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </RetroDataGrid>
    </section>
  );
}
