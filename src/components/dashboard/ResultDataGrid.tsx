import { useMemo, useState } from "react";
import type { ResultRow } from "../../types";
import type { TranslationKey, Translator } from "../../i18n";
import { formatCellValue, resultColumns } from "../../lib/export/columns";
import { sortResultRows } from "../../lib/results/sort";
import { RetroDataGrid } from "../retro/RetroDataGrid";
import { RetroButton } from "../retro/RetroButton";
import { RetroSelect } from "../retro/RetroSelect";
import { ExportPanel } from "./ExportPanel";

interface ResultDataGridProps {
  rows: ResultRow[];
  focusedUtc: string | null;
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

type SortKey =
  | "default"
  | "utcTime"
  | "localTime"
  | "body"
  | "azimuthDeg"
  | "apparentAltitudeDeg"
  | "geometricAltitudeDeg"
  | "illuminationPercent";

type SortDirection = "asc" | "desc";

const sortOptions: Array<{ key: SortKey; label: TranslationKey }> = [
  { key: "default", label: "sortDefault" },
  { key: "utcTime", label: "sortUtc" },
  { key: "localTime", label: "sortLocalTime" },
  { key: "body", label: "sortBody" },
  { key: "azimuthDeg", label: "sortAzimuth" },
  { key: "apparentAltitudeDeg", label: "sortApparentAltitude" },
  { key: "geometricAltitudeDeg", label: "sortGeometricAltitude" },
  { key: "illuminationPercent", label: "sortIllumination" }
];

function sortableValue(row: ResultRow, sortKey: SortKey): string | number | null {
  if (sortKey === "default") return null;
  if (sortKey === "localTime") return `${row.localDate}T${row.localTime}`;
  return row[sortKey] as string | number | null;
}

function compareRows(a: ResultRow, b: ResultRow, sortKey: SortKey, direction: SortDirection): number {
  if (sortKey === "default") {
    return 0;
  }

  const aValue = sortableValue(a, sortKey);
  const bValue = sortableValue(b, sortKey);
  const aEmpty = aValue === null || aValue === undefined || aValue === "";
  const bEmpty = bValue === null || bValue === undefined || bValue === "";

  if (aEmpty && bEmpty) return a.utcTime.localeCompare(b.utcTime);
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  const result = typeof aValue === "number" && typeof bValue === "number"
    ? aValue - bValue
    : String(aValue).localeCompare(String(bValue));

  return direction === "asc" ? result : -result;
}

export function ResultDataGrid({ rows, focusedUtc, onXlsx, onTxt, onMarkdown, t }: ResultDataGridProps) {
  const [bodyFilter, setBodyFilter] = useState<"all" | "sun" | "moon">("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const sortedRows = useMemo(() => sortResultRows(rows), [rows]);
  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filteredRows = sortedRows
      .filter((row) => bodyFilter === "all" || row.body === bodyFilter)
      .filter((row) => {
        if (!normalizedQuery) return true;
        return resultColumns.some((column) =>
          formatCellValue(row[column.key], t, tablePrecision(column.key)).toLowerCase().includes(normalizedQuery)
        );
      });

    return sortKey === "default"
      ? filteredRows
      : [...filteredRows].sort((a, b) => compareRows(a, b, sortKey, sortDirection) || a.utcTime.localeCompare(b.utcTime));
  }, [bodyFilter, query, sortedRows, sortDirection, sortKey, t]);

  return (
    <section className="result-data-grid-panel">
      <div className="terminal-section-title">[{t("resultDataGrid")}]</div>
      <div className="data-grid-meta">
        <span>{t("rows")}: {rows.length}</span>
        <span>{t("columnTimeZone")}: {rows[0]?.timeZone ?? "-"}</span>
      </div>
      <ExportPanel hasRows={rows.length > 0} onXlsx={onXlsx} onTxt={onTxt} onMarkdown={onMarkdown} t={t} />
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
        <label>
          {t("tableSort")}
          <RetroSelect value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            {sortOptions.map((option) => (
              <option key={option.key} value={option.key}>{t(option.label)}</option>
            ))}
          </RetroSelect>
        </label>
        <RetroButton
          type="button"
          onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")}
          aria-label={t("sortDirection")}
        >
          {sortDirection === "asc" ? t("sortAscending") : t("sortDescending")}
        </RetroButton>
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
