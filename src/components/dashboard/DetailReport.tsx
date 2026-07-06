import type { EventResult, ResultRow } from "../../types";
import type { Translator } from "../../i18n";
import { formatEventKind, formatWarning } from "../../lib/export/columns";
import type { SolarPhaseSummary } from "../../lib/solar/phases";
import { RetroAccordion } from "../retro/RetroAccordion";
import { EventLog } from "./EventLog";

interface DetailReportProps {
  events: EventResult[];
  firstInstantRows: ResultRow[];
  solarSummaries: SolarPhaseSummary[];
  onFocusUtc: (utcTime: string | null) => void;
  t: Translator;
}

function positionRows(rows: ResultRow[], body: "sun" | "moon", t: Translator) {
  const row = rows.find((item) => item.body === body);
  if (!row) return <p className="empty-state">{t("noRows")}</p>;
  return (
    <dl className="terminal-report compact-report">
      <dt>{t("columnAzimuthDeg")}</dt><dd>{row.azimuthDeg.toFixed(3)}</dd>
      <dt>{t("columnApparentAltitudeDeg")}</dt><dd>{row.apparentAltitudeDeg.toFixed(3)}</dd>
      <dt>{t("columnGeometricAltitudeDeg")}</dt><dd>{row.geometricAltitudeDeg.toFixed(3)}</dd>
      <dt>{t("columnDistanceKm")}</dt><dd>{row.distanceKm?.toFixed(0) ?? ""}</dd>
      {row.phaseName && <><dt>{t("columnPhaseName")}</dt><dd>{t(row.phaseName)}</dd></>}
      {row.warnings.length > 0 && <><dt>{t("columnWarnings")}</dt><dd>{row.warnings.map((warning) => formatWarning(warning, t)).join(", ")}</dd></>}
    </dl>
  );
}

export function DetailReport({ events, firstInstantRows, solarSummaries, onFocusUtc, t }: DetailReportProps) {
  const sunEvents = events.filter((event) => event.body === "sun");
  const moonEvents = events.filter((event) => event.body === "moon");

  return (
    <section className="detail-report">
      <div className="terminal-section-title">[{t("detailReport")}]</div>
      <RetroAccordion title={t("eventsSection")} defaultOpen>
        <EventLog events={events} onFocusUtc={onFocusUtc} t={t} />
      </RetroAccordion>
      <RetroAccordion title={t("currentSunPosition")}>{positionRows(firstInstantRows, "sun", t)}</RetroAccordion>
      <RetroAccordion title={t("currentMoonPosition")}>{positionRows(firstInstantRows, "moon", t)}</RetroAccordion>
      <RetroAccordion title={t("nextSunEvents")}>
        <div className="event-log static-log">
          {sunEvents.map((event) => <span key={`${event.body}-${event.kind}-${event.utcTime ?? event.localDate}`}>{event.localTime ?? "--:--"} {formatEventKind(event.kind, t)}</span>)}
        </div>
      </RetroAccordion>
      <RetroAccordion title={t("nextMoonEvents")}>
        <div className="event-log static-log">
          {moonEvents.map((event) => <span key={`${event.body}-${event.kind}-${event.utcTime ?? event.localDate}`}>{event.localTime ?? "--:--"} {formatEventKind(event.kind, t)}</span>)}
        </div>
      </RetroAccordion>
      <RetroAccordion title={t("twilightSummary")}>
        <div className="solar-phase-list">
          {solarSummaries.map((summary) => (
            <article key={summary.localDate}>
              <strong>{summary.localDate}</strong>
              <span>{t("day")}: {summary.phases.day ?? t("notInRange")}</span>
              <span>{t("civilTwilight")}: {summary.phases.civilTwilight ?? t("notInRange")}</span>
              <span>{t("nauticalTwilight")}: {summary.phases.nauticalTwilight ?? t("notInRange")}</span>
              <span>{t("astronomicalTwilight")}: {summary.phases.astronomicalTwilight ?? t("notInRange")}</span>
              <span>{t("night")}: {summary.phases.night ?? t("notInRange")}</span>
            </article>
          ))}
        </div>
      </RetroAccordion>
    </section>
  );
}
