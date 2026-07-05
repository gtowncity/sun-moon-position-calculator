import { useMemo, useState } from "react";
import type { ResultRow } from "../types";
import type { Translator } from "../i18n";
import { formatCellValue, resultColumns } from "../lib/export/columns";

interface ResultTableProps {
  rows: ResultRow[];
  t: Translator;
}

function tablePrecision(key: keyof ResultRow): number {
  if (key === "latitude" || key === "longitude") return 6;
  if (key === "distanceKm") return 3;
  if (key === "index") return 0;
  return 3;
}

export function ResultTable({ rows, t }: ResultTableProps) {
  const [bodyFilter, setBodyFilter] = useState<"all" | "sun" | "moon">("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<keyof ResultRow>("utcTime");

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...rows]
      .filter((row) => bodyFilter === "all" || row.body === bodyFilter)
      .filter((row) => {
        if (!normalizedQuery) return true;
        return resultColumns.some((column) =>
          formatCellValue(row[column.key], t, tablePrecision(column.key)).toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((a, b) => {
        const first = a[sortKey];
        const second = b[sortKey];
        if (typeof first === "number" && typeof second === "number") return first - second;
        return String(first ?? "").localeCompare(String(second ?? ""));
      });
  }, [bodyFilter, query, rows, sortKey, t]);

  if (rows.length === 0) {
    return <p className="empty-state">{t("noRows")}</p>;
  }

  return (
    <>
      <div className="table-tools" aria-label={t("tableTools")}>
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
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as keyof ResultRow)}>
            <option value="utcTime">{t("columnUtcTime")}</option>
            <option value="body">{t("columnBody")}</option>
            <option value="azimuthDeg">{t("columnAzimuthDeg")}</option>
            <option value="apparentAltitudeDeg">{t("columnApparentAltitudeDeg")}</option>
            <option value="geometricAltitudeDeg">{t("columnGeometricAltitudeDeg")}</option>
          </select>
        </label>
      </div>
      <div className="table-wrap">
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
              <tr key={`${row.utcTime}-${row.body}-${row.index}`}>
                {resultColumns.map((column) => (
                  <td key={column.key}>{formatCellValue(row[column.key], t, tablePrecision(column.key)) || t("emptyValue")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
