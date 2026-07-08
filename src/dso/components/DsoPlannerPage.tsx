import { useMemo, useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import type { Language, ObserverLocation } from "../../types";
import { RetroButton } from "../../components/retro/RetroButton";
import { RetroFieldset } from "../../components/retro/RetroFieldset";
import { RetroInput } from "../../components/retro/RetroInput";
import { RetroSelect } from "../../components/retro/RetroSelect";
import { downloadBlob, downloadTextFile } from "../../lib/export/download";
import { validateCoordinates } from "../../lib/location/validation";
import { parseDecimalNumber } from "../../lib/numberParsing";
import { messierCatalog } from "../catalog/messierCatalog";
import { searchMessierObjects } from "../catalog/messierSearch";
import {
  defaultDsoSetupProfile,
  fallbackDsoSetupProfile,
  objectTypeLabel,
  qualityProfileById,
  qualityProfiles,
  setupFieldOfView,
  setupPixelScaleArcSec
} from "../catalog/objectProfiles";
import { exportDsoMarkdown } from "../export/exportDsoMarkdown";
import { exportDsoText } from "../export/exportDsoText";
import { exportDsoXlsx } from "../export/exportDsoXlsx";
import { formatMinutesCompact, formatNumber, joinReasons } from "../export/format";
import { generateDsoPlan } from "../planner/generateDsoPlan";
import {
  loadDsoSetupProfiles,
  loadFavoriteMessierObjects,
  loadLastDsoSettings,
  loadLastQualityProfileId,
  saveFavoriteMessierObjects,
  saveLastDsoSettings
} from "../storage/dsoProfilesStorage";
import type { DeepSkyObject, DsoDateExceptions, DsoPlan, DsoPlannerSettings, DsoSetupProfile, QualityProfileId } from "../types";

interface DsoPlannerPageProps {
  language: Language;
  latitude: string;
  longitude: string;
  elevationMeters: string;
  locationName: string;
  timeZone: string;
  startDate: string;
}

const dsoText = {
  en: {
    title: "DSO Planner",
    input: "Input",
    location: "Location",
    range: "Range",
    object: "Messier object",
    setup: "Setup profile",
    quality: "Quality profile",
    mode: "Mode",
    calculate: "Calculate DSO plan",
    start: "Start date",
    end: "End date",
    weekendOnly: "Weekends only",
    forced: "Force dates",
    excluded: "Exclude dates",
    forcedHint: "YYYY-MM-DD separated by comma or line break",
    interval: "Interval",
    targetHours: "Target effective hours",
    rangeMode: "Evaluate range",
    targetMode: "Target integration",
    search: "Search",
    favorites: "Favorites",
    addFavorite: "Favorite",
    removeFavorite: "Unfavorite",
    profile: "Object profile",
    calendar: "Calendar",
    results: "DSO Results",
    noPlan: "No DSO plan calculated yet.",
    export: "Export DSO plan",
    nightSummary: "Night summary",
    windows: "Recommended windows",
    intervals: "Detailed intervals",
    limitations: "No weather is included. The score evaluates Sun, Moon and target altitude.",
    invalidLocation: "Please choose a valid location in the main control panel first.",
    invalidRange: "Please choose a valid date range.",
    targetProgress: "Target progress",
    reached: "reached",
    remaining: "remaining",
    allObjects: "All Messier objects",
    bortle: "Bortle",
    sqm: "SQM",
    selectedLocation: "Selected app location",
    effective: "effective",
    real: "real",
    bestTime: "Best time",
    reasons: "Reasons",
    warnings: "Warnings",
    twilight: "Twilight",
    moon: "Moon",
    altitude: "Altitude"
  },
  de: {
    title: "DSO Planner",
    input: "Eingabe",
    location: "Standort",
    range: "Zeitraum",
    object: "Messier-Objekt",
    setup: "Setup-Profil",
    quality: "Qualitaetsprofil",
    mode: "Modus",
    calculate: "DSO Plan berechnen",
    start: "Startdatum",
    end: "Enddatum",
    weekendOnly: "Nur Wochenenden",
    forced: "Tage erzwingen",
    excluded: "Tage ausschliessen",
    forcedHint: "YYYY-MM-DD, getrennt mit Komma oder Zeilenumbruch",
    interval: "Intervall",
    targetHours: "Effektive Wunschstunden",
    rangeMode: "Zeitraum auswerten",
    targetMode: "Wunschbelichtungszeit",
    search: "Suche",
    favorites: "Favoriten",
    addFavorite: "Favorit",
    removeFavorite: "Entfernen",
    profile: "Objektprofil",
    calendar: "Kalender",
    results: "DSO Ergebnisse",
    noPlan: "Noch kein DSO Plan berechnet.",
    export: "DSO Plan exportieren",
    nightSummary: "Nacht-Zusammenfassung",
    windows: "Empfohlene Fenster",
    intervals: "Detail-Intervalle",
    limitations: "Kein Wetter enthalten. Der Score bewertet Sonne, Mond und Zielhoehe.",
    invalidLocation: "Bitte zuerst einen gueltigen Standort im Haupt-Kontrollpanel waehlen.",
    invalidRange: "Bitte einen gueltigen Zeitraum waehlen.",
    targetProgress: "Ziel-Fortschritt",
    reached: "erreicht",
    remaining: "Rest",
    allObjects: "Alle Messier-Objekte",
    bortle: "Bortle",
    sqm: "SQM",
    selectedLocation: "Ausgewaehlter App-Standort",
    effective: "effektiv",
    real: "real",
    bestTime: "Beste Zeit",
    reasons: "Gruende",
    warnings: "Warnungen",
    twilight: "Daemmerung",
    moon: "Mond",
    altitude: "Hoehe"
  }
} as const;

function addDays(date: string, days: number): string {
  return Temporal.PlainDate.from(date).add({ days }).toString();
}

function parseDateList(value: string): string[] {
  return value
    .split(/[\s,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry));
}

function uniqueById(profiles: DsoSetupProfile[]): DsoSetupProfile[] {
  return profiles.filter((profile, index, all) => all.findIndex((entry) => entry.id === profile.id) === index);
}

function buildSettings(
  location: ObserverLocation,
  props: DsoPlannerPageProps,
  state: {
    startDate: string;
    endDate: string;
    intervalMinutes: number;
    weekendOnly: boolean;
    objectId: string;
    setupProfile: DsoSetupProfile;
    qualityId: string;
    mode: "range" | "targetHours";
    targetEffectiveHours: string;
    forceDates: string;
    excludeDates: string;
    bortle: string;
    sqm: string;
  }
): DsoPlannerSettings {
  const qualityProfile = qualityProfileById(state.qualityId);
  const exceptions: DsoDateExceptions = {
    forceInclude: parseDateList(state.forceDates),
    exclude: parseDateList(state.excludeDates)
  };

  return {
    location,
    locationName: props.locationName || "Manual location",
    timeZone: props.timeZone,
    startDate: state.startDate,
    endDate: state.endDate,
    weekendOnly: state.weekendOnly,
    exceptions,
    intervalMinutes: state.intervalMinutes,
    objectId: state.objectId,
    setupProfile: state.setupProfile,
    qualityProfile,
    mode: state.mode,
    targetEffectiveHours: parseDecimalNumber(state.targetEffectiveHours, { required: false }) ?? undefined,
    bortle: parseDecimalNumber(state.bortle, { required: false }) ?? undefined,
    sqm: parseDecimalNumber(state.sqm, { required: false }) ?? undefined
  };
}

function objectDifficultyLabel(object: DeepSkyObject): string {
  return `${object.planningProfile.broadbandDifficulty} / Moon ${Math.round(object.planningProfile.moonSensitivity * 100)}%`;
}

function filename(prefix: string, extension: string): string {
  return `${prefix}.${extension}`;
}

export function DsoPlannerPage(props: DsoPlannerPageProps) {
  const text = dsoText[props.language];
  const stored = typeof localStorage === "undefined" ? null : loadLastDsoSettings();
  const [startDate, setStartDate] = useState(stored?.startDate ?? props.startDate);
  const [endDate, setEndDate] = useState(stored?.endDate ?? addDays(props.startDate, 21));
  const [intervalMinutes, setIntervalMinutes] = useState(stored?.intervalMinutes ?? 10);
  const [weekendOnly, setWeekendOnly] = useState(stored?.weekendOnly ?? false);
  const [forceDates, setForceDates] = useState(stored?.exceptions?.forceInclude?.join("\n") ?? "");
  const [excludeDates, setExcludeDates] = useState(stored?.exceptions?.exclude?.join("\n") ?? "");
  const [objectId, setObjectId] = useState(stored?.objectId ?? "M31");
  const [objectQuery, setObjectQuery] = useState("M31");
  const [setupProfiles] = useState(() => uniqueById(loadDsoSetupProfiles()));
  const [setupProfileId, setSetupProfileId] = useState(stored?.setupProfile?.id ?? defaultDsoSetupProfile.id);
  const [qualityId, setQualityId] = useState(stored?.qualityProfile?.id ?? loadLastQualityProfileId());
  const [mode, setMode] = useState<"range" | "targetHours">(stored?.mode ?? "range");
  const [targetEffectiveHours, setTargetEffectiveHours] = useState(String(stored?.targetEffectiveHours ?? 25));
  const [bortle, setBortle] = useState(String(stored?.bortle ?? 4.6));
  const [sqm, setSqm] = useState(String(stored?.sqm ?? 21.0));
  const [favorites, setFavorites] = useState<string[]>(() => loadFavoriteMessierObjects());
  const [messages, setMessages] = useState<string[]>([]);
  const [plan, setPlan] = useState<DsoPlan | null>(null);
  const [showIntervals, setShowIntervals] = useState(false);

  const selectedObject = useMemo(() => messierCatalog.find((object) => object.id === objectId) ?? messierCatalog[30], [objectId]);
  const setupProfile = useMemo(
    () => setupProfiles.find((profile) => profile.id === setupProfileId) ?? fallbackDsoSetupProfile,
    [setupProfileId, setupProfiles]
  );
  const searchResults = useMemo(() => searchMessierObjects(objectQuery, 12), [objectQuery]);
  const fieldOfView = setupFieldOfView(setupProfile);
  const pixelScale = setupPixelScaleArcSec(setupProfile);

  function handleFavorite() {
    const next = favorites.includes(objectId) ? favorites.filter((id) => id !== objectId) : [...favorites, objectId];
    setFavorites(next);
    saveFavoriteMessierObjects(next);
  }

  function calculate() {
    const coordinates = validateCoordinates(props.latitude, props.longitude, props.elevationMeters);
    if (!coordinates.location) {
      setMessages([text.invalidLocation]);
      setPlan(null);
      return;
    }
    if (Temporal.PlainDate.compare(Temporal.PlainDate.from(endDate), Temporal.PlainDate.from(startDate)) < 0) {
      setMessages([text.invalidRange]);
      setPlan(null);
      return;
    }

    try {
      const settings = buildSettings(coordinates.location, props, {
        startDate,
        endDate,
        intervalMinutes,
        weekendOnly,
        objectId,
        setupProfile,
        qualityId,
        mode,
        targetEffectiveHours,
        forceDates,
        excludeDates,
        bortle,
        sqm
      });
      const nextPlan = generateDsoPlan(settings);
      saveLastDsoSettings(settings);
      setPlan(nextPlan);
      setMessages(nextPlan.warnings.slice(0, 4));
    } catch (error) {
      setMessages([error instanceof Error ? error.message : "DSO calculation failed."]);
      setPlan(null);
    }
  }

  function exportTxt() {
    if (plan) downloadTextFile(filename(`dso-plan-${plan.object.id}`, "txt"), exportDsoText(plan), "text/plain");
  }

  function exportMarkdownFile() {
    if (plan) downloadTextFile(filename(`dso-plan-${plan.object.id}`, "md"), exportDsoMarkdown(plan), "text/markdown");
  }

  async function exportXlsxFile() {
    if (!plan) return;
    const buffer = await exportDsoXlsx(plan);
    downloadBlob(
      filename(`dso-plan-${plan.object.id}`, "xlsx"),
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    );
  }

  return (
    <section className="dso-planner-panel" aria-label={text.title}>
      <div className="terminal-section-title">[{text.title}]</div>
      <p className="compact-hint">{text.limitations}</p>

      <div className="dso-input-grid">
        <RetroFieldset legend={text.location}>
          <div className="compact-location-display">
            <strong>{props.locationName || text.selectedLocation}</strong>
            <span>{props.latitude}, {props.longitude}</span>
            <span>{props.timeZone} | {text.bortle}: {bortle} | {text.sqm}: {sqm}</span>
          </div>
          <div className="calculation-options-grid">
            <label>{text.bortle}<RetroInput value={bortle} inputMode="decimal" onChange={(event) => setBortle(event.target.value)} /></label>
            <label>{text.sqm}<RetroInput value={sqm} inputMode="decimal" onChange={(event) => setSqm(event.target.value)} /></label>
          </div>
        </RetroFieldset>

        <RetroFieldset legend={text.range}>
          <label>{text.start}<RetroInput type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label>{text.end}<RetroInput type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <label>{text.interval}
            <RetroSelect value={String(intervalMinutes)} onChange={(event) => setIntervalMinutes(Number(event.target.value))}>
              {[5, 10, 15, 30, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
            </RetroSelect>
          </label>
          <label className="dso-checkbox"><input type="checkbox" checked={weekendOnly} onChange={(event) => setWeekendOnly(event.target.checked)} /> {text.weekendOnly}</label>
        </RetroFieldset>

        <RetroFieldset legend={text.mode}>
          <RetroSelect value={mode} onChange={(event) => setMode(event.target.value as "range" | "targetHours")}>
            <option value="range">{text.rangeMode}</option>
            <option value="targetHours">{text.targetMode}</option>
          </RetroSelect>
          {mode === "targetHours" && (
            <label>{text.targetHours}<RetroInput value={targetEffectiveHours} inputMode="decimal" onChange={(event) => setTargetEffectiveHours(event.target.value)} /></label>
          )}
          <label>{text.quality}
            <RetroSelect value={qualityId} onChange={(event) => setQualityId(event.target.value as QualityProfileId)}>
              {qualityProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </RetroSelect>
          </label>
        </RetroFieldset>

        <RetroFieldset legend={text.setup}>
          <RetroSelect value={setupProfileId} onChange={(event) => setSetupProfileId(event.target.value)}>
            {setupProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </RetroSelect>
          <dl className="terminal-report">
            <dt>FOV</dt><dd>{fieldOfView ? `${formatNumber(fieldOfView.widthDeg, 2)} x ${formatNumber(fieldOfView.heightDeg, 2)} deg` : "-"}</dd>
            <dt>Scale</dt><dd>{pixelScale ? `${formatNumber(pixelScale, 2)} arcsec/px` : "-"}</dd>
            <dt>Filter</dt><dd>{setupProfile.filterMode}</dd>
          </dl>
        </RetroFieldset>

        <RetroFieldset legend={text.object} className="dso-object-search">
          <label>{text.search}<RetroInput value={objectQuery} onChange={(event) => setObjectQuery(event.target.value)} placeholder="M31, Andromeda, NGC 224" /></label>
          <div className="dso-object-results">
            {searchResults.map((object) => (
              <button
                type="button"
                key={object.id}
                className={`dso-object-result ${object.id === objectId ? "is-active" : ""}`}
                onClick={() => {
                  setObjectId(object.id);
                  setObjectQuery(object.id);
                }}
              >
                <strong>{object.id}</strong>
                <span>{object.primaryName}</span>
                <small>{objectTypeLabel(object.objectType)} | mag {object.visualMagnitude ?? "-"} | {objectDifficultyLabel(object)}</small>
              </button>
            ))}
          </div>
          <div className="compact-action-row">
            <RetroButton type="button" onClick={handleFavorite}>{favorites.includes(objectId) ? text.removeFavorite : text.addFavorite}</RetroButton>
            <span className="compact-hint">{text.allObjects}: {messierCatalog.length}</span>
          </div>
        </RetroFieldset>

        <RetroFieldset legend={text.profile} className="dso-object-card">
          <h3>{selectedObject.id} {selectedObject.primaryName}</h3>
          <dl className="terminal-report">
            <dt>RA/Dec</dt><dd>{formatNumber(selectedObject.raHours, 3)}h / {formatNumber(selectedObject.decDeg, 2)} deg</dd>
            <dt>Type</dt><dd>{objectTypeLabel(selectedObject.objectType)}</dd>
            <dt>Size</dt><dd>{selectedObject.majorAxisArcMin ?? selectedObject.apparentSizeArcMin ?? "-"} arcmin</dd>
            <dt>Mag</dt><dd>{selectedObject.visualMagnitude ?? "-"}</dd>
            <dt>Moon</dt><dd>{formatNumber(selectedObject.planningProfile.moonSensitivity, 2)}</dd>
            <dt>Main alt</dt><dd>{selectedObject.planningProfile.minMainAltitudeDeg} deg</dd>
          </dl>
          <p className="compact-hint">{[...(selectedObject.notes ?? []), ...selectedObject.planningProfile.notes].slice(0, 3).join(" ")}</p>
        </RetroFieldset>

        <RetroFieldset legend="Exceptions">
          <label>{text.forced}<textarea value={forceDates} onChange={(event) => setForceDates(event.target.value)} placeholder={text.forcedHint} /></label>
          <label>{text.excluded}<textarea value={excludeDates} onChange={(event) => setExcludeDates(event.target.value)} placeholder={text.forcedHint} /></label>
        </RetroFieldset>
      </div>

      <div className="analyze-row">
        <RetroButton type="button" variant="primary" onClick={calculate}>{text.calculate}</RetroButton>
      </div>

      {messages.length > 0 && <section className="messages compact-messages" aria-live="polite">{messages.map((message) => <p key={message}>{message}</p>)}</section>}

      <section className="dso-results">
        <div className="terminal-section-title">[{text.results}]</div>
        {!plan ? <p className="empty-state">{text.noPlan}</p> : (
          <>
            <div className="dso-export-row">
              <span>{text.export}</span>
              <RetroButton type="button" onClick={exportXlsxFile}>XLSX</RetroButton>
              <RetroButton type="button" onClick={exportTxt}>TXT</RetroButton>
              <RetroButton type="button" onClick={exportMarkdownFile}>MD</RetroButton>
            </div>

            <div className="dso-summary-grid">
              <article><span>MAIN</span><strong>{formatMinutesCompact(plan.totals.mainMinutes)}</strong></article>
              <article><span>EXTRA</span><strong>{formatMinutesCompact(plan.totals.extraMinutes)}</strong></article>
              <article><span>{text.effective}</span><strong>{formatMinutesCompact(plan.totals.effectiveMinutes)}</strong></article>
              <article><span>Nights</span><strong>{plan.nights.length}</strong></article>
            </div>

            {plan.targetHoursPlan && (
              <section className="dso-target-progress">
                <div className="terminal-section-title">[{text.targetProgress}]</div>
                <div className="dso-progress-bar"><span style={{ width: `${Math.min(100, plan.targetHoursPlan.effectiveDurationMinutes / Math.max(1, plan.targetHoursPlan.targetEffectiveMinutes) * 100)}%` }} /></div>
                <p>
                  {formatMinutesCompact(plan.targetHoursPlan.effectiveDurationMinutes)} / {formatMinutesCompact(plan.targetHoursPlan.targetEffectiveMinutes)} {text.effective} -
                  {" "}{plan.targetHoursPlan.reached ? text.reached : `${text.remaining}: ${formatMinutesCompact(plan.targetHoursPlan.remainingEffectiveMinutes)}`}
                  {" "}({formatMinutesCompact(plan.targetHoursPlan.realDurationMinutes)} {text.real})
                </p>
              </section>
            )}

            <section className="dso-calendar">
              <div className="terminal-section-title">[{text.calendar}]</div>
              <div className="dso-calendar-grid">
                {plan.calendar.map((entry) => (
                  <span key={entry.date} className={`dso-day dso-day-${entry.status}`} title={`${entry.nightLabel}: ${entry.reason}`}>
                    {entry.date.slice(5)}
                  </span>
                ))}
              </div>
              <div className="twilight-legend">
                <span className="dso-day dso-day-included">included</span>
                <span className="dso-day dso-day-forced">forced</span>
                <span className="dso-day dso-day-excluded">excluded</span>
              </div>
            </section>

            <section className="dso-timelines">
              {plan.nights.map((night) => (
                <article key={night.nightLabel} className="dso-night-row">
                  <div>
                    <strong>{night.nightLabel}</strong>
                    <span>{night.overallNightRating} | {text.bestTime}: {night.bestWindowStart ?? "-"}-{night.bestWindowEnd ?? "-"}</span>
                    <span>{text.altitude}: max {formatNumber(night.targetMaxAltitudeDeg)} deg, culmination {night.targetCulminationTime ?? "-"}</span>
                  </div>
                  <div className="dso-window-track">
                    {night.windows.map((window) => (
                      <span
                        key={`${window.startUtc}-${window.category}`}
                        className={`dso-window dso-window-${window.category.toLowerCase()}`}
                        style={{ flexGrow: Math.max(1, window.durationMinutes) }}
                        title={`${window.startLocal}-${window.endLocal} ${window.category}, score ${formatNumber(window.averageScore, 0)}, target ${formatNumber(window.averageTargetAltitude)} deg, Moon ${formatNumber(window.averageMoonIllumination, 0)}% / ${formatNumber(window.averageMoonDistance, 0)} deg`}
                      >
                        {window.category}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </section>

            <section className="dso-table-panel">
              <div className="terminal-section-title">[{text.nightSummary}]</div>
              <div className="retro-data-grid">
                <table>
                  <thead><tr><th>Night</th><th>Rating</th><th>Astro night</th><th>Culmination</th><th>Max alt</th><th>&gt;40</th><th>MAIN</th><th>EXTRA</th><th>Effective</th><th>{text.warnings}</th></tr></thead>
                  <tbody>{plan.nights.map((night) => (
                    <tr key={night.nightLabel}>
                      <td>{night.nightLabel}</td>
                      <td>{night.overallNightRating}</td>
                      <td>{night.astronomicalNightStart ?? "-"}-{night.astronomicalNightEnd ?? "-"}</td>
                      <td>{night.targetCulminationTime ?? "-"}</td>
                      <td>{formatNumber(night.targetMaxAltitudeDeg)} deg</td>
                      <td>{formatMinutesCompact(night.timeAbove40)}</td>
                      <td>{formatMinutesCompact(night.mainDuration)}</td>
                      <td>{formatMinutesCompact(night.extraDuration)}</td>
                      <td>{formatMinutesCompact(night.effectiveDuration)}</td>
                      <td>{joinReasons(night.mainWarnings.slice(0, 2)) || "-"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>

            <section className="dso-table-panel">
              <div className="terminal-section-title">[{text.windows}]</div>
              <div className="retro-data-grid">
                <table>
                  <thead><tr><th>Night</th><th>Category</th><th>Start</th><th>End</th><th>Duration</th><th>Eff.</th><th>Score</th><th>Target</th><th>{text.moon}</th><th>{text.reasons}</th></tr></thead>
                  <tbody>{plan.recommendedWindows.slice(0, 40).map((window) => (
                    <tr key={`${window.nightLabel}-${window.startUtc}`}>
                      <td>{window.nightLabel}</td>
                      <td>{window.category}{window.selectedForTarget ? " *" : ""}</td>
                      <td>{window.startLocal}</td>
                      <td>{window.endLocal}</td>
                      <td>{formatMinutesCompact(window.durationMinutes)}</td>
                      <td>{formatMinutesCompact(window.effectiveDurationMinutes)}</td>
                      <td>{formatNumber(window.averageScore, 0)}</td>
                      <td>{formatNumber(window.averageTargetAltitude)} deg</td>
                      <td>{formatNumber(window.averageMoonIllumination, 0)}% / {formatNumber(window.averageMoonDistance, 0)} deg</td>
                      <td>{joinReasons(window.reasonsSummary)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>

            <section className="dso-table-panel">
              <div className="dso-section-heading">
                <div className="terminal-section-title">[{text.intervals}]</div>
                <RetroButton type="button" onClick={() => setShowIntervals((shown) => !shown)}>{showIntervals ? "Hide" : "Show"}</RetroButton>
              </div>
              {showIntervals && (
                <div className="retro-data-grid">
                  <table>
                    <thead><tr><th>Night</th><th>Local</th><th>Score</th><th>Cat</th><th>Sun</th><th>Moon</th><th>Moon dist</th><th>Target alt</th><th>Airmass</th><th>{text.reasons}</th></tr></thead>
                    <tbody>{plan.nights.flatMap((night) => night.intervals).slice(0, 800).map((interval) => (
                      <tr key={`${interval.nightLabel}-${interval.utcDateTime}`}>
                        <td>{interval.nightLabel}</td>
                        <td>{interval.localDateTime.slice(11)}</td>
                        <td>{interval.finalDsoScore}</td>
                        <td>{interval.category}</td>
                        <td>{formatNumber(interval.sunAltitudeDeg)} deg</td>
                        <td>{formatNumber(interval.moonIlluminationPercent, 0)}%, {formatNumber(interval.moonAltitudeDeg)} deg</td>
                        <td>{formatNumber(interval.angularSeparationMoonTargetDeg, 0)} deg</td>
                        <td>{formatNumber(interval.targetAltitudeDeg)} deg</td>
                        <td>{interval.targetAirmassApprox ? formatNumber(interval.targetAirmassApprox, 2) : "-"}</td>
                        <td>{joinReasons(interval.reasons.slice(0, 3))}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </section>
  );
}
