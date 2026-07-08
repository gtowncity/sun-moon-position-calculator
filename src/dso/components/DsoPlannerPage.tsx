import { useMemo, useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import type { Language, ObserverLocation } from "../../types";
import { RetroButton } from "../../components/retro/RetroButton";
import { RetroFieldset } from "../../components/retro/RetroFieldset";
import { RetroInput } from "../../components/retro/RetroInput";
import { RetroSelect } from "../../components/retro/RetroSelect";
import { formatLocationLabel, searchLocation } from "../../domain/geocoding";
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
import { formatMinutesCompact, formatNumber } from "../export/format";
import { generateDsoPlan } from "../planner/generateDsoPlan";
import {
  loadDsoSetupProfiles,
  loadFavoriteMessierObjects,
  loadLastDsoSettings,
  loadLastQualityProfileId,
  saveFavoriteMessierObjects,
  saveLastDsoSettings
} from "../storage/dsoProfilesStorage";
import type {
  DeepSkyObject,
  DsoCategory,
  DsoDateExceptions,
  DsoInterval,
  DsoNightPlan,
  DsoPlan,
  DsoPlannerSettings,
  DsoSetupProfile,
  DsoWindow,
  QualityProfileId
} from "../types";
import "./DsoPlannerPage.css";

interface DsoPlannerPageProps {
  language: Language;
  latitude: string;
  longitude: string;
  elevationMeters: string;
  locationName: string;
  timeZone: string;
  startDate: string;
}

type PlannerMode = "range" | "targetHours";
type CalendarVisualStatus = "selected" | "main" | "extra" | "test" | "bad" | "excluded" | "forced" | "empty";

const dsoText = {
  en: {
    title: "DSO Planner",
    location: "Location",
    object: "Messier object",
    setup: "Setup profile",
    quality: "Quality profile",
    mode: "Mode",
    calculate: "Calculate DSO plan",
    start: "Start date",
    end: "End date",
    weekendOnly: "Weekends only",
    forced: "Additional nights to include",
    excluded: "Nights to exclude",
    forcedHint: "YYYY-MM-DD separated by comma or line break",
    interval: "Interval",
    targetHours: "Target effective hours",
    rangeMode: "Analyze date range",
    targetMode: "Reach target exposure",
    search: "Search",
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
    limitations: "This tool plans DSO sessions from Sun, Moon, target position and your setup. Weather is not included.",
    invalidLocation: "Please enter valid coordinates in the DSO location section.",
    invalidRange: "Please choose a valid date range.",
    targetProgress: "Target progress",
    reached: "reached",
    remaining: "remaining",
    allObjects: "All Messier objects",
    bortle: "Bortle",
    sqm: "SQM",
    effective: "effective",
    real: "real",
    bestTime: "Best time",
    reasons: "Reasons",
    warnings: "Warnings",
    moon: "Moon",
    altitude: "Altitude"
  },
  de: {
    title: "DSO Planner",
    location: "1. Standort",
    object: "2. Zielobjekt",
    setup: "3. Setup",
    quality: "Qualitaetsprofil",
    mode: "4. Planung",
    calculate: "DSO Plan berechnen",
    start: "Startdatum",
    end: "Enddatum",
    weekendOnly: "Nur Wochenenden",
    forced: "Zusaetzliche Naechte einbeziehen",
    excluded: "Naechte ausschliessen",
    forcedHint: "YYYY-MM-DD, getrennt mit Komma oder Zeilenumbruch",
    interval: "Rechenintervall",
    targetHours: "Effektive Wunschstunden",
    rangeMode: "Zeitraum analysieren",
    targetMode: "Wunschbelichtungszeit erreichen",
    search: "Objekt suchen",
    addFavorite: "Favorit",
    removeFavorite: "Entfernen",
    profile: "Objektprofil",
    calendar: "Kalender",
    results: "5. Ergebnis",
    noPlan: "Noch kein DSO Plan berechnet.",
    export: "DSO Plan exportieren",
    nightSummary: "Naechte im Ueberblick",
    windows: "Top-Aufnahmefenster",
    intervals: "Detailintervalle / Rohdaten",
    limitations: "Dieses Tool plant DSO-Aufnahmen anhand von Sonne, Mond, Objektposition und deinem Setup. Wetter ist nicht enthalten.",
    invalidLocation: "Bitte gueltige Koordinaten im DSO-Standortbereich eingeben.",
    invalidRange: "Bitte einen gueltigen Zeitraum waehlen.",
    targetProgress: "Ziel-Fortschritt",
    reached: "erreicht",
    remaining: "Rest",
    allObjects: "Alle Messier-Objekte",
    bortle: "Bortle",
    sqm: "SQM",
    effective: "effektiv",
    real: "real",
    bestTime: "Beste Zeit",
    reasons: "Gruende",
    warnings: "Warnungen",
    moon: "Mond",
    altitude: "Hoehe"
  }
} as const;

const germanMonths = [
  "Januar",
  "Februar",
  "Maerz",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember"
];

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
  state: {
    locationName: string;
    timeZone: string;
    startDate: string;
    endDate: string;
    intervalMinutes: number;
    weekendOnly: boolean;
    objectId: string;
    setupProfile: DsoSetupProfile;
    qualityId: string;
    mode: PlannerMode;
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
    locationName: state.locationName || "Manual location",
    timeZone: state.timeZone || "Europe/Berlin",
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

function windowKey(window: DsoWindow): string {
  return `${window.nightLabel}-${window.startUtc}-${window.endUtc}`;
}

function categoryMeaning(category: DsoCategory): string {
  switch (category) {
    case "MAIN":
      return "beste Hauptdaten, bevorzugt stacken";
    case "EXTRA":
      return "brauchbare Zusatzdaten, meist nutzbar";
    case "TEST":
      return "nur Testdaten / schwach, vorsichtig verwenden";
    case "BAD":
      return "nicht aufnehmen";
  }
}

function humanCategory(category: DsoCategory): string {
  return `${category} - ${categoryMeaning(category)}`;
}

function humanizeReason(reason: string): string {
  if (reason.includes("No astronomical night interval")) return "Keine astronomische Nacht in diesem Zeitraum.";
  if (reason.includes("Weak broadband target")) return "Der Himmel ist fuer dieses schwache Breitband-Objekt noch zu hell.";
  if (reason.includes("Target below usable altitude") || reason.includes("Target never reaches usable altitude")) return "Das Objekt steht zu niedrig.";
  if (reason.includes("Low target altitude")) return "Das Objekt steht niedrig: hoehere Airmass und mehr Risiko.";
  if (reason.includes("Moon below horizon")) return "Der Mond ist unter dem Horizont, also kein Mondproblem.";
  if (reason.includes("Moon") && reason.includes("high")) return "Der Mond steht hoch und kann dieses Ziel stoeren.";
  if (reason.includes("bright astronomical twilight")) return "Es ist noch zu hell fuer saubere Hauptdaten.";
  if (reason.includes("Broadband galaxy details")) return "Galaxien-Details profitieren stark von dunklem, mondfreiem Himmel.";
  if (reason.includes("Sun")) return reason.replace("Sun", "Sonne").replace("target", "Ziel");
  return reason;
}

function humanizeReasonList(reasons: string[], limit = 3): string {
  return reasons.slice(0, limit).map(humanizeReason).join("; ") || "-";
}

function statusLabel(status: "included" | "excluded" | "forced"): string {
  if (status === "forced") return "zusaetzlich einbezogen";
  if (status === "excluded") return "ausgeschlossen";
  return "wird berechnet";
}

function ratingLabel(rating: DsoNightPlan["overallNightRating"]): string {
  switch (rating) {
    case "excellent":
      return "sehr gut";
    case "good":
      return "gut";
    case "usable":
      return "brauchbar";
    case "poor":
      return "schwach";
    case "bad":
      return "schlecht";
  }
}

function monthLabel(month: string): string {
  const date = Temporal.PlainYearMonth.from(month);
  return `${germanMonths[date.month - 1]} ${date.year}`;
}

function getWindowNightDate(window: DsoWindow): string {
  return window.nightLabel.slice(0, 10);
}

function findRepresentativeInterval(plan: DsoPlan, window: DsoWindow): DsoInterval | null {
  const night = plan.nights.find((entry) => entry.nightLabel === window.nightLabel);
  if (!night) return null;
  const start = Temporal.Instant.from(window.startUtc);
  const end = Temporal.Instant.from(window.endUtc);
  const matches = night.intervals.filter((interval) => {
    const instant = Temporal.Instant.from(interval.utcDateTime);
    return Temporal.Instant.compare(instant, start) >= 0 && Temporal.Instant.compare(instant, end) < 0;
  });
  return matches.sort((a, b) => b.finalDsoScore - a.finalDsoScore)[0] ?? null;
}

function primaryWindowReason(window: DsoWindow): string {
  return humanizeReasonList([...window.warningsSummary, ...window.reasonsSummary], 1);
}

function nightStatus(night: DsoNightPlan | undefined, selected: boolean, excluded: boolean, forced: boolean): CalendarVisualStatus {
  if (excluded) return "excluded";
  if (selected) return "selected";
  if (forced) return "forced";
  if (!night) return "empty";
  if (night.mainDuration > 0 || night.overallNightRating === "excellent" || night.overallNightRating === "good") return "main";
  if (night.extraDuration > 0 || night.overallNightRating === "usable") return "extra";
  if (night.testDuration > 0 || night.overallNightRating === "poor") return "test";
  return "bad";
}

function calendarStatusText(status: CalendarVisualStatus): string {
  switch (status) {
    case "selected":
      return "ausgewaehlt";
    case "main":
      return "sehr gut";
    case "extra":
      return "brauchbar";
    case "test":
      return "Test";
    case "bad":
      return "schlecht";
    case "excluded":
      return "ausgeschlossen";
    case "forced":
      return "zusaetzlich";
    case "empty":
      return "-";
  }
}

function uniqueMonths(startDate: string, endDate: string): string[] {
  const start = Temporal.PlainDate.from(startDate).with({ day: 1 });
  const end = Temporal.PlainDate.from(endDate).with({ day: 1 });
  const months: string[] = [];
  let current = start;
  while (Temporal.PlainDate.compare(current, end) <= 0) {
    months.push(current.toPlainYearMonth().toString());
    current = current.add({ months: 1 });
  }
  return months;
}

function nightsByDate(plan: DsoPlan): Map<string, DsoNightPlan> {
  return new Map(plan.nights.map((night) => [night.dateStart, night]));
}

function selectedEffectiveByDate(windows: DsoWindow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const window of windows) {
    const date = getWindowNightDate(window);
    map.set(date, (map.get(date) ?? 0) + window.effectiveDurationMinutes);
  }
  return map;
}

function selectedRealByDate(windows: DsoWindow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const window of windows) {
    const date = getWindowNightDate(window);
    map.set(date, (map.get(date) ?? 0) + window.durationMinutes);
  }
  return map;
}

export function DsoPlannerPage(props: DsoPlannerPageProps) {
  const text = dsoText[props.language];
  const stored = typeof localStorage === "undefined" ? null : loadLastDsoSettings();
  const [locationName, setLocationName] = useState(stored?.location?.latitude ? stored.locationName : props.locationName || "Berlin");
  const [latitude, setLatitude] = useState(String(stored?.location?.latitude ?? props.latitude));
  const [longitude, setLongitude] = useState(String(stored?.location?.longitude ?? props.longitude));
  const [elevationMeters, setElevationMeters] = useState(String(stored?.location?.elevationMeters ?? props.elevationMeters));
  const [timeZone, setTimeZone] = useState(stored?.timeZone ?? props.timeZone);
  const [locationQuery, setLocationQuery] = useState(stored?.locationName ?? props.locationName ?? "Berlin");
  const [locationMessage, setLocationMessage] = useState("");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [startDate, setStartDate] = useState(stored?.startDate ?? props.startDate);
  const [endDate, setEndDate] = useState(stored?.endDate ?? addDays(props.startDate, 21));
  const [intervalMinutes, setIntervalMinutes] = useState(stored?.intervalMinutes ?? 10);
  const [weekendOnly, setWeekendOnly] = useState(stored?.weekendOnly ?? false);
  const [forceDates, setForceDates] = useState(stored?.exceptions?.forceInclude?.join("\n") ?? "");
  const [excludeDates, setExcludeDates] = useState(stored?.exceptions?.exclude?.join("\n") ?? "");
  const [objectId, setObjectId] = useState(stored?.objectId ?? "M31");
  const [objectQuery, setObjectQuery] = useState(stored?.objectId ?? "M31");
  const [setupProfiles] = useState(() => uniqueById(loadDsoSetupProfiles()));
  const [setupProfileId, setSetupProfileId] = useState(stored?.setupProfile?.id ?? defaultDsoSetupProfile.id);
  const [qualityId, setQualityId] = useState(stored?.qualityProfile?.id ?? loadLastQualityProfileId());
  const [mode, setMode] = useState<PlannerMode>(stored?.mode ?? "range");
  const [targetEffectiveHours, setTargetEffectiveHours] = useState(String(stored?.targetEffectiveHours ?? 20));
  const [bortle, setBortle] = useState(String(stored?.bortle ?? 4.6));
  const [sqm, setSqm] = useState(String(stored?.sqm ?? 21.0));
  const [favorites, setFavorites] = useState<string[]>(() => loadFavoriteMessierObjects());
  const [messages, setMessages] = useState<string[]>([]);
  const [plan, setPlan] = useState<DsoPlan | null>(null);
  const [showIntervals, setShowIntervals] = useState(false);
  const [selectedNightLabel, setSelectedNightLabel] = useState<string | null>(null);

  const selectedObject = useMemo(() => messierCatalog.find((object) => object.id === objectId) ?? messierCatalog[30], [objectId]);
  const setupProfile = useMemo(
    () => setupProfiles.find((profile) => profile.id === setupProfileId) ?? fallbackDsoSetupProfile,
    [setupProfileId, setupProfiles]
  );
  const searchResults = useMemo(() => searchMessierObjects(objectQuery, 12), [objectQuery]);
  const fieldOfView = setupFieldOfView(setupProfile);
  const pixelScale = setupPixelScaleArcSec(setupProfile);
  const isTargetHoursMode = mode === "targetHours";
  const targetPlan = plan?.targetHoursPlan ?? null;
  const selectedWindows = targetPlan?.selectedWindows ?? [];
  const selectedWindowKeys = useMemo(() => new Set(selectedWindows.map(windowKey)), [selectedWindows]);
  const selectedDates = useMemo(() => new Set(selectedWindows.map(getWindowNightDate)), [selectedWindows]);
  const nightMap = useMemo(() => (plan ? nightsByDate(plan) : new Map<string, DsoNightPlan>()), [plan]);
  const selectedEffectiveMap = useMemo(() => selectedEffectiveByDate(selectedWindows), [selectedWindows]);
  const selectedRealMap = useMemo(() => selectedRealByDate(selectedWindows), [selectedWindows]);
  const focusedNight = plan?.nights.find((night) => night.nightLabel === selectedNightLabel) ?? plan?.nights[0] ?? null;
  const windowsForDisplay = plan
    ? isTargetHoursMode && targetPlan
      ? targetPlan.selectedWindows
      : plan.recommendedWindows.slice(0, 40)
    : [];
  const reserveEffectiveMinutes = plan && targetPlan ? Math.max(0, plan.totals.effectiveMinutes - targetPlan.effectiveDurationMinutes) : 0;

  function handleFavorite() {
    const next = favorites.includes(objectId) ? favorites.filter((id) => id !== objectId) : [...favorites, objectId];
    setFavorites(next);
    saveFavoriteMessierObjects(next);
  }

  async function handleLocationSearch() {
    setIsSearchingLocation(true);
    setLocationMessage("");
    try {
      const result = await searchLocation(locationQuery);
      setLocationName(formatLocationLabel(result));
      setLatitude(result.latitude.toFixed(6));
      setLongitude(result.longitude.toFixed(6));
      setElevationMeters(String(Math.round(result.elevation ?? 0)));
      setTimeZone(result.timezone ?? "Europe/Berlin");
      setLocationMessage("Ort gefunden. Du kannst die Koordinaten trotzdem manuell anpassen.");
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : "Ortssuche fehlgeschlagen. Bitte Koordinaten manuell eingeben.");
    } finally {
      setIsSearchingLocation(false);
    }
  }

  function calculate() {
    const coordinates = validateCoordinates(latitude, longitude, elevationMeters);
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
      const settings = buildSettings(coordinates.location, {
        locationName: locationName || "Manual location",
        timeZone: timeZone || "Europe/Berlin",
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
      setSelectedNightLabel(nextPlan.nights[0]?.nightLabel ?? null);
      setMessages(nextPlan.warnings.slice(0, 4).map(humanizeReason));
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

  function renderWhyWindow(window: DsoWindow) {
    if (!plan) return null;
    const interval = findRepresentativeInterval(plan, window);
    return (
      <details className="dso-why-box">
        <summary>Warum diese Bewertung?</summary>
        <p>
          Dieses Fenster ist <strong>{window.category}</strong>, weil Sonne, Mond und Zielhoehe zusammen einen Score von etwa {formatNumber(window.averageScore, 0)} ergeben.
          {window.category === "EXTRA" && " Es ist brauchbar, aber nicht perfekt genug fuer MAIN."}
          {window.selectedForTarget && " Dieses Fenster wurde fuer die Wunschbelichtungszeit ausgewaehlt."}
        </p>
        <dl className="terminal-report dso-why-grid">
          <dt>Sonnenhoehe</dt><dd>{formatNumber(window.averageSunAltitude)} deg</dd>
          <dt>Daemmerung</dt><dd>{interval?.twilightClass ?? "-"}</dd>
          <dt>Mondhoehe</dt><dd>{formatNumber(window.averageMoonAltitude)} deg</dd>
          <dt>Mondbeleuchtung</dt><dd>{formatNumber(window.averageMoonIllumination, 0)}%</dd>
          <dt>Mondabstand</dt><dd>{formatNumber(window.averageMoonDistance, 0)} deg</dd>
          <dt>Zielhoehe</dt><dd>{formatNumber(window.averageTargetAltitude)} deg</dd>
          <dt>Airmass</dt><dd>{interval?.targetAirmassApprox ? formatNumber(interval.targetAirmassApprox, 2) : "-"}</dd>
          <dt>Score Sonne</dt><dd>{interval ? formatNumber(interval.sunScore, 0) : "-"}</dd>
          <dt>Score Mond</dt><dd>{interval ? formatNumber(interval.moonScore, 0) : "-"}</dd>
          <dt>Score Zielhoehe</dt><dd>{interval ? formatNumber(interval.targetAltitudeScore, 0) : "-"}</dd>
          <dt>Finaler Score</dt><dd>{formatNumber(window.averageScore, 0)}</dd>
          <dt>Kategorie</dt><dd>{humanCategory(window.category)}</dd>
          <dt>Reale Dauer</dt><dd>{formatMinutesCompact(window.durationMinutes)}</dd>
          <dt>Effektive Dauer</dt><dd>{formatMinutesCompact(window.effectiveDurationMinutes)}</dd>
        </dl>
        <p className="compact-hint">{humanizeReasonList([...window.warningsSummary, ...window.reasonsSummary], 4)}</p>
      </details>
    );
  }

  function renderCalendar() {
    if (!plan) return null;
    const months = uniqueMonths(plan.settings.startDate, plan.settings.endDate);
    return (
      <section className="dso-calendar dso-card-section">
        <div className="terminal-section-title">[{text.calendar}]</div>
        <div className="dso-calendar-legend">
          <span className="dso-calendar-status-selected">ausgewaehlt fuer Ziel</span>
          <span className="dso-calendar-status-main">sehr gut / MAIN</span>
          <span className="dso-calendar-status-extra">brauchbar / EXTRA</span>
          <span className="dso-calendar-status-test">Testdaten</span>
          <span className="dso-calendar-status-bad">schlecht</span>
          <span className="dso-calendar-status-excluded">ausgeschlossen</span>
        </div>
        <div className="dso-months">
          {months.map((month) => {
            const first = Temporal.PlainYearMonth.from(month).toPlainDate({ day: 1 });
            const daysInMonth = first.daysInMonth;
            const blanks = Array.from({ length: first.dayOfWeek - 1 }, (_, index) => index);
            return (
              <article key={month} className="dso-month">
                <h3>{monthLabel(month)}</h3>
                <div className="dso-weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div>
                <div className="dso-month-grid">
                  {blanks.map((blank) => <span key={`blank-${blank}`} className="dso-calendar-empty" />)}
                  {Array.from({ length: daysInMonth }, (_, index) => {
                    const date = first.add({ days: index }).toString();
                    const entry = plan.calendar.find((item) => item.date === date);
                    const night = nightMap.get(date);
                    const excluded = entry?.status === "excluded";
                    const forced = entry?.status === "forced";
                    const status = nightStatus(night, selectedDates.has(date), excluded, forced);
                    const selectedEff = selectedEffectiveMap.get(date) ?? 0;
                    const effective = isTargetHoursMode ? selectedEff : night?.effectiveDuration ?? 0;
                    return (
                      <button
                        type="button"
                        key={date}
                        className={`dso-calendar-day dso-calendar-status-${status} ${focusedNight?.dateStart === date ? "is-focused" : ""}`}
                        onClick={() => night && setSelectedNightLabel(night.nightLabel)}
                        title={`${date}: ${entry ? statusLabel(entry.status) : "ausserhalb Suchzeitraum"}`}
                      >
                        <strong>{index + 1}</strong>
                        <span>{calendarStatusText(status)}</span>
                        <small>{night?.bestWindowStart ? `${night.bestWindowStart}-${night.bestWindowEnd ?? ""}` : "-"}</small>
                        <em>{effective > 0 ? formatMinutesCompact(effective) : ""}</em>
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="dso-planner-panel dso-assistant" aria-label={text.title}>
      <div className="dso-hero">
        <div>
          <div className="terminal-section-title">[{text.title}]</div>
          <p>{text.limitations}</p>
        </div>
        <div className="dso-mode-note">
          {isTargetHoursMode
            ? "Modus: Die besten Fenster werden bis zur Wunschbelichtungszeit gesammelt."
            : "Modus: Alle Naechte im Zeitraum werden bewertet."}
        </div>
      </div>

      <div className="dso-step-grid">
        <RetroFieldset legend={text.location} className="dso-step dso-step-wide">
          <div className="dso-location-search-row">
            <label>Ort / PLZ suchen
              <RetroInput value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="z.B. Geiselhoering, Berlin, 94333" />
            </label>
            <RetroButton type="button" onClick={handleLocationSearch} disabled={isSearchingLocation}>{isSearchingLocation ? "Suche..." : "Ort suchen"}</RetroButton>
          </div>
          {locationMessage && <p className="compact-hint">{locationMessage}</p>}
          <div className="dso-form-grid">
            <label>Standortname<RetroInput value={locationName} onChange={(event) => setLocationName(event.target.value)} /></label>
            <label>Breite<RetroInput value={latitude} inputMode="decimal" onChange={(event) => setLatitude(event.target.value)} /></label>
            <label>Laenge<RetroInput value={longitude} inputMode="decimal" onChange={(event) => setLongitude(event.target.value)} /></label>
            <label>Hoehe Meter<RetroInput value={elevationMeters} inputMode="decimal" onChange={(event) => setElevationMeters(event.target.value)} /></label>
            <label>Zeitzone<RetroInput value={timeZone} onChange={(event) => setTimeZone(event.target.value)} /></label>
            <label>{text.bortle}<RetroInput value={bortle} inputMode="decimal" onChange={(event) => setBortle(event.target.value)} /></label>
            <label>{text.sqm}<RetroInput value={sqm} inputMode="decimal" onChange={(event) => setSqm(event.target.value)} /></label>
          </div>
        </RetroFieldset>

        <RetroFieldset legend={text.object} className="dso-step dso-step-wide dso-object-search">
          <label>{text.search}<RetroInput value={objectQuery} onChange={(event) => setObjectQuery(event.target.value)} placeholder="M31, M51, Andromeda" /></label>
          <div className="dso-object-results dso-object-results-compact">
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

        <RetroFieldset legend={text.profile} className="dso-step dso-object-card">
          <h3>{selectedObject.id} {selectedObject.primaryName}</h3>
          <dl className="terminal-report">
            <dt>RA/Dec</dt><dd>{formatNumber(selectedObject.raHours, 3)}h / {formatNumber(selectedObject.decDeg, 2)} deg</dd>
            <dt>Typ</dt><dd>{objectTypeLabel(selectedObject.objectType)}</dd>
            <dt>Groesse</dt><dd>{selectedObject.majorAxisArcMin ?? selectedObject.apparentSizeArcMin ?? "-"} arcmin</dd>
            <dt>Mag</dt><dd>{selectedObject.visualMagnitude ?? "-"}</dd>
            <dt>Mondempfindlich</dt><dd>{formatNumber(selectedObject.planningProfile.moonSensitivity, 2)}</dd>
            <dt>MAIN ab</dt><dd>{selectedObject.planningProfile.minMainAltitudeDeg} deg Hoehe</dd>
          </dl>
          <p className="compact-hint">{[...(selectedObject.notes ?? []), ...selectedObject.planningProfile.notes].slice(0, 3).map(humanizeReason).join(" ")}</p>
        </RetroFieldset>

        <RetroFieldset legend={text.setup} className="dso-step">
          <label>{text.setup}
            <RetroSelect value={setupProfileId} onChange={(event) => setSetupProfileId(event.target.value)}>
              {setupProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </RetroSelect>
          </label>
          <label>{text.quality}
            <RetroSelect value={qualityId} onChange={(event) => setQualityId(event.target.value as QualityProfileId)}>
              {qualityProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </RetroSelect>
          </label>
          <dl className="terminal-report">
            <dt>FOV</dt><dd>{fieldOfView ? `${formatNumber(fieldOfView.widthDeg, 2)} x ${formatNumber(fieldOfView.heightDeg, 2)} deg` : "-"}</dd>
            <dt>Scale</dt><dd>{pixelScale ? `${formatNumber(pixelScale, 2)} arcsec/px` : "-"}</dd>
            <dt>Filter</dt><dd>{setupProfile.filterMode}</dd>
          </dl>
        </RetroFieldset>

        <RetroFieldset legend={text.mode} className="dso-step dso-step-wide">
          <div className="dso-mode-choice">
            <label><input type="radio" checked={mode === "range"} onChange={() => setMode("range")} /> <span>{text.rangeMode}</span></label>
            <label><input type="radio" checked={mode === "targetHours"} onChange={() => setMode("targetHours")} /> <span>{text.targetMode}</span></label>
          </div>
          <p className="compact-hint">
            {isTargetHoursMode
              ? "Du gibst Wunschstunden und einen Suchzeitraum an. Das Ergebnis zeigt hauptsaechlich die ausgewaehlten Fenster bis zum Ziel."
              : "Alle berechneten Naechte im Zeitraum werden zusammengefasst."}
          </p>
          <div className="dso-form-grid">
            <label>{text.start}<RetroInput type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label>{text.end}<RetroInput type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
            <label>{text.interval}
              <RetroSelect value={String(intervalMinutes)} onChange={(event) => setIntervalMinutes(Number(event.target.value))}>
                {[5, 10, 15, 30, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
              </RetroSelect>
            </label>
            {isTargetHoursMode && (
              <label>{text.targetHours}<RetroInput value={targetEffectiveHours} inputMode="decimal" onChange={(event) => setTargetEffectiveHours(event.target.value)} /></label>
            )}
            <label className="dso-checkbox"><input type="checkbox" checked={weekendOnly} onChange={(event) => setWeekendOnly(event.target.checked)} /> {text.weekendOnly}</label>
          </div>
        </RetroFieldset>

        <RetroFieldset legend="Optionale Ausnahmen" className="dso-step dso-step-wide">
          <div className="dso-form-grid two-columns">
            <label>{text.forced}<textarea value={forceDates} onChange={(event) => setForceDates(event.target.value)} placeholder={text.forcedHint} /></label>
            <label>{text.excluded}<textarea value={excludeDates} onChange={(event) => setExcludeDates(event.target.value)} placeholder={text.forcedHint} /></label>
          </div>
          <p className="compact-hint">Zusaetzliche Naechte werden trotz Wochenendfilter berechnet. Ausgeschlossene Naechte werden ignoriert.</p>
        </RetroFieldset>
      </div>

      <div className="analyze-row dso-analyze-row">
        <RetroButton type="button" variant="primary" onClick={calculate}>{text.calculate}</RetroButton>
      </div>

      {messages.length > 0 && <section className="messages compact-messages" aria-live="polite">{messages.map((message) => <p key={message}>{message}</p>)}</section>}

      <section className="dso-results dso-card-section">
        <div className="terminal-section-title">[{text.results}]</div>
        {!plan ? <p className="empty-state">{text.noPlan}</p> : (
          <>
            <div className="dso-export-row">
              <span>{text.export}</span>
              <RetroButton type="button" onClick={exportXlsxFile}>XLSX</RetroButton>
              <RetroButton type="button" onClick={exportTxt}>TXT</RetroButton>
              <RetroButton type="button" onClick={exportMarkdownFile}>MD</RetroButton>
            </div>

            <section className="dso-result-summary">
              <div>
                <h2>{isTargetHoursMode && targetPlan
                  ? targetPlan.reached
                    ? `Ziel erreicht: ${formatMinutesCompact(targetPlan.effectiveDurationMinutes)} effektiv ausgewaehlt.`
                    : `Ziel noch nicht erreicht: ${formatMinutesCompact(targetPlan.remainingEffectiveMinutes)} fehlen.`
                  : `${plan.nights.length} Naechte im Zeitraum bewertet.`}</h2>
                <p>
                  {isTargetHoursMode && targetPlan
                    ? `Nimm zuerst die ${targetPlan.selectedWindows.length} ausgewaehlten Fenster auf. Leicht ueber Ziel ist normal, weil ganze Aufnahmefenster verwendet werden.`
                    : `Beste Fenster werden nach Score, Zielhoehe, Sonne und Mond sortiert.`}
                </p>
              </div>
              <div className="dso-summary-grid dso-summary-grid-readable">
                {isTargetHoursMode && targetPlan ? (
                  <>
                    <article><span>Ziel</span><strong>{formatMinutesCompact(targetPlan.targetEffectiveMinutes)}</strong></article>
                    <article><span>Ausgewaehlt</span><strong>{formatMinutesCompact(targetPlan.effectiveDurationMinutes)}</strong></article>
                    <article><span>Echte Zeit</span><strong>{formatMinutesCompact(targetPlan.realDurationMinutes)}</strong></article>
                    <article><span>Reserve</span><strong>{formatMinutesCompact(reserveEffectiveMinutes)}</strong></article>
                  </>
                ) : (
                  <>
                    <article><span>MAIN</span><strong>{formatMinutesCompact(plan.totals.mainMinutes)}</strong></article>
                    <article><span>EXTRA</span><strong>{formatMinutesCompact(plan.totals.extraMinutes)}</strong></article>
                    <article><span>{text.effective}</span><strong>{formatMinutesCompact(plan.totals.effectiveMinutes)}</strong></article>
                    <article><span>Naechte</span><strong>{plan.nights.length}</strong></article>
                  </>
                )}
              </div>
            </section>

            {targetPlan && (
              <section className="dso-target-progress dso-card-section">
                <div className="terminal-section-title">[{text.targetProgress}]</div>
                <div className="dso-progress-bar"><span style={{ width: `${Math.min(100, targetPlan.effectiveDurationMinutes / Math.max(1, targetPlan.targetEffectiveMinutes) * 100)}%` }} /></div>
                <p>
                  Ziel: {formatMinutesCompact(targetPlan.targetEffectiveMinutes)} {text.effective} | Ausgewaehlt: {formatMinutesCompact(targetPlan.effectiveDurationMinutes)} {text.effective} | echte Aufnahmezeit: {formatMinutesCompact(targetPlan.realDurationMinutes)} | Status: {targetPlan.reached ? text.reached : `${text.remaining}: ${formatMinutesCompact(targetPlan.remainingEffectiveMinutes)}`}
                </p>
              </section>
            )}

            <section className="dso-category-help dso-card-section">
              <strong>Kategorien:</strong>
              <span><b>MAIN</b> = beste Hauptdaten, bevorzugt stacken</span>
              <span><b>EXTRA</b> = brauchbare Zusatzdaten</span>
              <span><b>TEST</b> = nur Test / schwach</span>
              <span><b>BAD</b> = nicht aufnehmen</span>
            </section>

            <section className="dso-table-panel dso-card-section">
              <div className="terminal-section-title">[{text.windows}]</div>
              <div className="retro-data-grid dso-readable-table">
                <table>
                  <thead><tr><th>Datum</th><th>Start</th><th>Ende</th><th>Kategorie</th><th>Echt</th><th>Effektiv</th><th>Score</th><th>Hauptgrund</th></tr></thead>
                  <tbody>{windowsForDisplay.map((window) => (
                    <tr key={`${window.nightLabel}-${window.startUtc}`} className={selectedWindowKeys.has(windowKey(window)) ? "is-focused-row" : undefined}>
                      <td>{window.nightLabel}</td>
                      <td>{window.startLocal}</td>
                      <td>{window.endLocal}</td>
                      <td>{window.selectedForTarget ? "ausgewaehlt " : ""}{window.category}</td>
                      <td>{formatMinutesCompact(window.durationMinutes)}</td>
                      <td>{formatMinutesCompact(window.effectiveDurationMinutes)}</td>
                      <td>{formatNumber(window.averageScore, 0)}</td>
                      <td>{primaryWindowReason(window)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {windowsForDisplay.slice(0, 8).map((window) => (
                <article key={`why-${window.nightLabel}-${window.startUtc}`} className="dso-window-card">
                  <div>
                    <strong>{window.nightLabel} {window.startLocal}-{window.endLocal}</strong>
                    <span>{humanCategory(window.category)} | {formatMinutesCompact(window.durationMinutes)} real {"->"} {formatMinutesCompact(window.effectiveDurationMinutes)} effektiv</span>
                  </div>
                  {renderWhyWindow(window)}
                </article>
              ))}
            </section>

            {renderCalendar()}

            {focusedNight && (
              <section className="dso-night-focus dso-card-section">
                <div className="terminal-section-title">[Ausgewaehlte Nacht]</div>
                <h3>{focusedNight.nightLabel} - {ratingLabel(focusedNight.overallNightRating)}</h3>
                <dl className="terminal-report">
                  <dt>Beste Zeit</dt><dd>{focusedNight.bestWindowStart ?? "-"}-{focusedNight.bestWindowEnd ?? "-"}</dd>
                  <dt>Astronomische Nacht</dt><dd>{focusedNight.astronomicalNightStart ?? "-"}-{focusedNight.astronomicalNightEnd ?? "-"}</dd>
                  <dt>Kulmination</dt><dd>{focusedNight.targetCulminationTime ?? "-"}</dd>
                  <dt>Max. Hoehe</dt><dd>{formatNumber(focusedNight.targetMaxAltitudeDeg)} deg</dd>
                  <dt>MAIN</dt><dd>{formatMinutesCompact(focusedNight.mainDuration)}</dd>
                  <dt>EXTRA</dt><dd>{formatMinutesCompact(focusedNight.extraDuration)}</dd>
                  <dt>Effektiv</dt><dd>{formatMinutesCompact(isTargetHoursMode ? (selectedEffectiveMap.get(focusedNight.dateStart) ?? 0) : focusedNight.effectiveDuration)}</dd>
                </dl>
                <p className="compact-hint">{humanizeReasonList(focusedNight.mainWarnings, 4)}</p>
                <div className="dso-window-track">
                  {focusedNight.windows.map((window) => (
                    <span
                      key={`${window.startUtc}-${window.category}`}
                      className={`dso-window dso-window-${window.category.toLowerCase()} ${selectedWindowKeys.has(windowKey(window)) ? "is-selected-target" : ""}`}
                      style={{ flexGrow: Math.max(1, window.durationMinutes) }}
                      title={`${window.startLocal}-${window.endLocal} ${window.category}, score ${formatNumber(window.averageScore, 0)}`}
                    >
                      {selectedWindowKeys.has(windowKey(window)) ? "ZIEL" : window.category}
                    </span>
                  ))}
                </div>
                {selectedRealMap.get(focusedNight.dateStart) ? <p className="compact-hint">Fuer Ziel ausgewaehlt: {formatMinutesCompact(selectedRealMap.get(focusedNight.dateStart) ?? 0)} real / {formatMinutesCompact(selectedEffectiveMap.get(focusedNight.dateStart) ?? 0)} effektiv.</p> : null}
              </section>
            )}

            <section className="dso-table-panel dso-card-section">
              <div className="terminal-section-title">[{text.nightSummary}]</div>
              <div className="retro-data-grid dso-readable-table">
                <table>
                  <thead><tr><th>Nacht</th><th>Bewertung</th><th>Beste Zeit</th><th>Max Hoehe</th><th>MAIN</th><th>EXTRA</th><th>Effektiv</th><th>{text.warnings}</th></tr></thead>
                  <tbody>{plan.nights.map((night) => (
                    <tr key={night.nightLabel}>
                      <td>{night.nightLabel}</td>
                      <td>{ratingLabel(night.overallNightRating)}</td>
                      <td>{night.bestWindowStart ?? "-"}-{night.bestWindowEnd ?? "-"}</td>
                      <td>{formatNumber(night.targetMaxAltitudeDeg)} deg</td>
                      <td>{formatMinutesCompact(night.mainDuration)}</td>
                      <td>{formatMinutesCompact(night.extraDuration)}</td>
                      <td>{formatMinutesCompact(isTargetHoursMode ? (selectedEffectiveMap.get(night.dateStart) ?? 0) : night.effectiveDuration)}</td>
                      <td>{humanizeReasonList(night.mainWarnings, 2)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>

            <section className="dso-table-panel dso-card-section">
              <div className="dso-section-heading">
                <div className="terminal-section-title">[{text.intervals}]</div>
                <RetroButton type="button" onClick={() => setShowIntervals((shown) => !shown)}>{showIntervals ? "Rohdaten ausblenden" : "Rohdaten anzeigen"}</RetroButton>
              </div>
              <p className="compact-hint">Das sind die Rohdaten pro Intervall. Fuer normale Planung brauchst du sie nicht.</p>
              {showIntervals && (
                <div className="retro-data-grid">
                  <table>
                    <thead><tr><th>Nacht</th><th>Lokal</th><th>Score</th><th>Kat</th><th>Sonne</th><th>Mond</th><th>Monddistanz</th><th>Zielhoehe</th><th>Airmass</th><th>{text.reasons}</th></tr></thead>
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
                        <td>{humanizeReasonList(interval.reasons, 3)}</td>
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
