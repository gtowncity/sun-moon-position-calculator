import { useEffect, useMemo, useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import {
  Calculator,
  Download,
  FileSpreadsheet,
  FileText,
  Languages,
  LocateFixed,
  MapPin,
  Save,
  Search,
  Telescope,
  Trash2
} from "lucide-react";
import type {
  CalculationFormState,
  EventResult,
  Language,
  ObserverLocation,
  RefractionMode,
  RefractionSettings,
  ResultRow,
  SavedLocation,
  TimeRangeMode
} from "../types";
import { detectBrowserLanguage, getTranslator, isLanguage, type TranslationKey } from "../i18n";
import { calculateDailyEvents } from "../astro/events";
import { standardPressureHpa, standardTemperatureC } from "../astro/common/refraction";
import { calculatePositions } from "../lib/astronomy/calculator";
import { downloadBlob, downloadTextFile } from "../lib/export/download";
import { exportCsv } from "../lib/export/csv";
import { exportMarkdown } from "../lib/export/markdown";
import { createExportMetadata } from "../lib/export/metadata";
import { exportTxt } from "../lib/export/txt";
import { exportXlsx } from "../lib/export/xlsx";
import { formatEventKind, formatWarning } from "../lib/export/columns";
import { GeocodingHttpError, GeocodingNetworkError, OpenMeteoGeocodingProvider } from "../lib/geocoding/openMeteo";
import { getBrowserLocation } from "../lib/location/geolocation";
import {
  deleteSavedLocation,
  loadSavedLocations,
  markSavedLocationUsed,
  upsertSavedLocation
} from "../lib/location/savedLocations";
import { validateCoordinates } from "../lib/location/validation";
import { parseDecimalNumber } from "../lib/numberParsing";
import { sortResultRows } from "../lib/results/sort";
import { summarizeSolarPhases } from "../lib/solar/phases";
import { addHours, generateIntervalInstants, getNowParts, localDateTimeToInstant, maxTimePoints } from "../lib/time/dateTime";
import { getBrowserTimeZone, getSupportedTimeZones, isValidTimeZone } from "../lib/time/timeZones";
import { createDashboardInsight, findSample } from "./insights";
import { AstroDashboard, type AnalysisMode, type RangePreset } from "../components/AstroDashboard";
import { ResultTable } from "../components/ResultTable";
import type { ImagingMode } from "../domain/insights/effectiveImagingWindow";

const intervalOptions = [1, 5, 10, 15, 30, 60];
const languageStorageKey = "solar-lunar-position-tool.language";

interface CalculationMeta {
  location: ObserverLocation;
  startLocal: string;
  endLocal: string;
  intervalMinutes: number | null;
  rangeMode: TimeRangeMode;
  refraction: RefractionSettings;
}

function storedLanguage(): Language {
  if (typeof localStorage === "undefined") return detectBrowserLanguage();
  const stored = localStorage.getItem(languageStorageKey);
  return isLanguage(stored) ? stored : detectBrowserLanguage();
}

function createInitialForm(): CalculationFormState {
  const timeZone = getBrowserTimeZone();
  const now = getNowParts(timeZone);

  return {
    language: storedLanguage(),
    bodySelection: "both",
    latitude: "52.520000",
    longitude: "13.405000",
    elevationMeters: "34",
    locationName: "Berlin",
    locationSource: "manual",
    searchCountryCode: "",
    startDate: now.date,
    startTime: now.time,
    rangeMode: "single",
    endDate: now.date,
    endTime: now.time,
    durationHours: "1",
    intervalPreset: "15",
    customIntervalMinutes: "15",
    intervalMinutes: 15,
    timeZone,
    refractionMode: "standard",
    pressureHpa: String(standardPressureHpa),
    temperatureC: String(standardTemperatureC)
  };
}

function filename(prefix: string, extension: string): string {
  return `${prefix}.${extension}`;
}

function safeLoadSavedLocations(): SavedLocation[] {
  try {
    return loadSavedLocations();
  } catch {
    return [];
  }
}

function numericInput(value: string): number | null {
  return parseDecimalNumber(value, { required: true });
}

function formatAngle(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(3) : "";
}

function countryOptions() {
  return ["", "DE", "US", "GB", "AU", "FR", "ES", "IT", "NL", "AT", "CH"];
}

function datePlusDays(date: string, days: number): string {
  try {
    return Temporal.PlainDate.from(date).add({ days }).toString();
  } catch {
    return date;
  }
}

function analysisPatch(mode: AnalysisMode, startDate: string): Partial<CalculationFormState> {
  if (mode === "instant") {
    return { startDate, endDate: startDate, rangeMode: "single" };
  }

  if (mode === "night") {
    return {
      startDate,
      endDate: datePlusDays(startDate, 1),
      startTime: "16:00",
      endTime: "10:00",
      rangeMode: "duration",
      durationHours: "18",
      intervalPreset: "10",
      intervalMinutes: 10,
      customIntervalMinutes: "10"
    };
  }

  if (mode === "multi") {
    return {
      startDate,
      endDate: datePlusDays(startDate, 7),
      startTime: "16:00",
      rangeMode: "duration",
      durationHours: "168",
      intervalPreset: "30",
      intervalMinutes: 30,
      customIntervalMinutes: "30"
    };
  }

  return { startDate };
}

function eventDatesFor(sourceForm: CalculationFormState): string[] {
  const dates = new Set<string>([sourceForm.startDate]);
  const durationHours = sourceForm.rangeMode === "duration" ? numericInput(sourceForm.durationHours) : null;
  const dayCount = durationHours ? Math.min(31, Math.max(1, Math.ceil(durationHours / 24) + 1)) : 1;

  for (let day = 1; day < dayCount; day += 1) {
    dates.add(datePlusDays(sourceForm.startDate, day));
  }

  if (sourceForm.rangeMode === "end") {
    dates.add(sourceForm.endDate);
  }

  return [...dates].sort();
}

export function App() {
  const [form, setForm] = useState<CalculationFormState>(() => createInitialForm());
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [events, setEvents] = useState<EventResult[]>([]);
  const [calculationMeta, setCalculationMeta] = useState<CalculationMeta | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [rangePreset, setRangePreset] = useState<RangePreset>("night");
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("night");
  const [imagingMode, setImagingMode] = useState<ImagingMode>("strict");
  const [focusedUtc, setFocusedUtc] = useState<string | null>(null);
  const [hoveredUtc, setHoveredUtc] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<import("../types").GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => safeLoadSavedLocations());
  const [saveLocationName, setSaveLocationName] = useState("");

  const t = useMemo(() => getTranslator(form.language), [form.language]);
  const timeZones = useMemo(() => getSupportedTimeZones(), []);
  const geocoder = useMemo(() => new OpenMeteoGeocodingProvider(), []);
  const sortedRows = useMemo(() => sortResultRows(rows), [rows]);
  const insight = useMemo(() => createDashboardInsight(rows, { imagingMode, nightStartDate: form.startDate }), [form.startDate, imagingMode, rows]);
  const focusedSample = useMemo(() => findSample(insight.samples, focusedUtc), [focusedUtc, insight.samples]);
  const hoveredSample = useMemo(() => findSample(insight.samples, hoveredUtc), [hoveredUtc, insight.samples]);
  const solarSummaries = useMemo(() => summarizeSolarPhases(rows), [rows]);
  const firstInstantRows = useMemo(() => {
    const firstUtc = rows[0]?.utcTime;
    return firstUtc ? rows.filter((row) => row.utcTime === firstUtc) : [];
  }, [rows]);

  useEffect(() => {
    localStorage.setItem(languageStorageKey, form.language);
  }, [form.language]);

  useEffect(() => {
    const initialForm = { ...form, ...analysisPatch("night", form.startDate) };
    setForm(initialForm);
    calculateWithForm(initialForm, false);
    // Initial dashboard bootstrap only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateForm(partial: Partial<CalculationFormState>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function updateManualLocation(partial: Partial<CalculationFormState>) {
    updateForm({ ...partial, locationSource: "manual" });
  }

  function selectedIntervalMinutesFor(sourceForm: CalculationFormState): number | null {
    const raw = sourceForm.intervalPreset === "custom" ? sourceForm.customIntervalMinutes : sourceForm.intervalPreset;
    const parsed = numericInput(raw);
    return parsed;
  }

  function selectedIntervalMinutes(): number | null {
    return selectedIntervalMinutesFor(form);
  }

  function currentRefractionSettingsFor(
    sourceForm: CalculationFormState,
    nextMessages: string[],
    localT: typeof t
  ): RefractionSettings | null {
    const mode = sourceForm.refractionMode;

    if (mode !== "custom") {
      return {
        mode,
        pressureHpa: standardPressureHpa,
        temperatureC: standardTemperatureC
      };
    }

    const pressureHpa = numericInput(sourceForm.pressureHpa);
    const temperatureC = numericInput(sourceForm.temperatureC);

    if (pressureHpa === null || pressureHpa <= 0) {
      nextMessages.push(localT("invalidPressure"));
    }

    if (temperatureC === null) {
      nextMessages.push(localT("invalidTemperature"));
    }

    if (pressureHpa === null || pressureHpa <= 0 || temperatureC === null) {
      return null;
    }

    return { mode, pressureHpa, temperatureC };
  }

  function currentRefractionSettings(nextMessages: string[]): RefractionSettings | null {
    return currentRefractionSettingsFor(form, nextMessages, t);
  }

  async function handleAutoDetect() {
    const detectedTimeZone = getBrowserTimeZone();
    const now = getNowParts(detectedTimeZone);

    updateForm({
      timeZone: detectedTimeZone,
      startDate: now.date,
      startTime: now.time
    });

    try {
      const location = await getBrowserLocation();
      updateForm({
        latitude: location.latitude.toFixed(6),
        longitude: location.longitude.toFixed(6),
        elevationMeters: location.elevationMeters.toFixed(1),
        locationName: t("geolocationLocationName"),
        locationSource: "geolocation"
      });
      setLocationAccuracy(location.accuracyMeters ?? null);
      setMessages([t("autoDetectDone")]);
    } catch (error) {
      const message = error instanceof Error && (error.message === "geolocationUnsupported" || error.message === "geolocationDenied")
        ? t(error.message as TranslationKey)
        : t("partialAutoDetect");
      setMessages([message === t("partialAutoDetect") ? message : `${t("partialAutoDetect")} ${message}`]);
    }
  }

  async function handleSearch() {
    setIsSearching(true);
    setMessages([]);

    try {
      const results = await geocoder.search(searchQuery, form.language, form.searchCountryCode || undefined);
      setSearchResults(results);
      if (results.length === 0) {
        setMessages([t("noResults")]);
      } else if (results.length > 1) {
        setMessages([t("multipleResultsHint")]);
      }
    } catch (error) {
      if (error instanceof GeocodingHttpError) {
        setMessages([`${t("searchFailed")} HTTP ${error.status}: ${error.reason}`]);
      } else if (error instanceof GeocodingNetworkError) {
        setMessages([t("networkSearchFailed")]);
      } else {
        setMessages([t("searchFailed")]);
      }
    } finally {
      setIsSearching(false);
    }
  }

  function applyGeocodingResult(result: import("../types").GeocodingResult) {
    updateForm({
      latitude: result.latitude.toFixed(6),
      longitude: result.longitude.toFixed(6),
      elevationMeters: (result.elevationMeters ?? 0).toFixed(1),
      timeZone: result.timeZone && isValidTimeZone(result.timeZone) ? result.timeZone : form.timeZone,
      locationName: result.name,
      locationSource: "geocoding"
    });
  }

  function handleSaveCurrentLocation() {
    const coordinates = validateCoordinates(form.latitude, form.longitude, form.elevationMeters);
    const name = saveLocationName.trim() || form.locationName.trim();

    if (!coordinates.location) {
      setMessages(coordinates.errors.map((error) => t(error)));
      return;
    }

    if (!name) {
      setMessages([t("invalidLocationName")]);
      return;
    }

    const locations = upsertSavedLocation({
      name,
      ...coordinates.location,
      timeZone: form.timeZone,
      source: form.locationSource
    });
    setSavedLocations(locations);
    setSaveLocationName("");
    setMessages([t("locationSaved")]);
  }

  function handleApplySavedLocation(location: SavedLocation) {
    updateForm({
      latitude: location.latitude.toFixed(6),
      longitude: location.longitude.toFixed(6),
      elevationMeters: location.elevationMeters.toFixed(1),
      timeZone: location.timeZone,
      locationName: location.name,
      locationSource: location.source
    });
    setSavedLocations(markSavedLocationUsed(location.id));
    setMessages([t("locationApplied")]);
  }

  function handleDeleteSavedLocation(id: string) {
    setSavedLocations(deleteSavedLocation(id));
    setMessages([t("locationDeleted")]);
  }

  function calculateWithForm(sourceForm: CalculationFormState, showMessages = true) {
    const localT = getTranslator(sourceForm.language);
    const nextMessages: string[] = [];
    const coordinates = validateCoordinates(sourceForm.latitude, sourceForm.longitude, sourceForm.elevationMeters);
    const refraction = currentRefractionSettingsFor(sourceForm, nextMessages, localT);

    for (const error of coordinates.errors) {
      nextMessages.push(localT(error));
    }

    const start = localDateTimeToInstant(sourceForm.startDate, sourceForm.startTime, sourceForm.timeZone);
    if (start.messageKey) {
      nextMessages.push(localT(start.messageKey));
    }

    const intervalMinutes = selectedIntervalMinutesFor(sourceForm);
    if (sourceForm.rangeMode !== "single" && (intervalMinutes === null || intervalMinutes <= 0)) {
      nextMessages.push(localT("invalidInterval"));
    }
    if (sourceForm.rangeMode !== "single" && intervalMinutes !== null && (intervalMinutes < 1 || intervalMinutes > 1440)) {
      nextMessages.push(localT("invalidIntervalMax"));
    }

    if (!coordinates.location || !start.instant || !refraction) {
      setRows([]);
      setEvents([]);
      setCalculationMeta(null);
      if (showMessages) setMessages(nextMessages.length ? nextMessages : [localT("validationErrors")]);
      return false;
    }

    const observerLocation = coordinates.location;
    let endInstant = start.instant;
    let endLocalLabel = `${sourceForm.startDate} ${sourceForm.startTime} ${sourceForm.timeZone}`;
    let instants = [start.instant];
    let exportInterval: number | null = null;

    try {
      if (sourceForm.rangeMode === "end") {
        const end = localDateTimeToInstant(sourceForm.endDate, sourceForm.endTime, sourceForm.timeZone);
        if (end.messageKey) nextMessages.push(localT(end.messageKey));
        if (!end.instant || Temporal.Instant.compare(end.instant, start.instant) <= 0) {
          nextMessages.push(localT("invalidRange"));
        } else if (intervalMinutes !== null) {
          endInstant = end.instant;
          endLocalLabel = `${sourceForm.endDate} ${sourceForm.endTime} ${sourceForm.timeZone}`;
          const interval = generateIntervalInstants(start.instant, endInstant, intervalMinutes, maxTimePoints);
          if (interval.warnings.includes("tooManyRows")) nextMessages.push(localT("tooManyRows"));
          instants = interval.instants;
          exportInterval = intervalMinutes;
        }
      }

      if (sourceForm.rangeMode === "duration") {
        const durationHours = numericInput(sourceForm.durationHours);
        if (durationHours === null || durationHours <= 0) {
          nextMessages.push(localT("invalidRange"));
        } else if (intervalMinutes !== null) {
          endInstant = addHours(start.instant, durationHours);
          const endParts = endInstant.toZonedDateTimeISO(sourceForm.timeZone);
          endLocalLabel = `${endParts.toPlainDate().toString()} ${endParts.toPlainTime().toString({ smallestUnit: "minute" })} ${sourceForm.timeZone}`;
          const interval = generateIntervalInstants(start.instant, endInstant, intervalMinutes, maxTimePoints);
          if (interval.warnings.includes("tooManyRows")) nextMessages.push(localT("tooManyRows"));
          instants = interval.instants;
          exportInterval = intervalMinutes;
        }
      }
    } catch {
      nextMessages.push(localT("invalidRange"));
    }

    if (
      nextMessages.includes(localT("invalidRange")) ||
      nextMessages.includes(localT("tooManyRows")) ||
      nextMessages.includes(localT("invalidInterval")) ||
      nextMessages.includes(localT("invalidIntervalMax"))
    ) {
      setRows([]);
      setEvents([]);
      setCalculationMeta(null);
      if (showMessages) setMessages(nextMessages);
      return false;
    }

    try {
      const resultRows = calculatePositions({
        instants,
        observer: observerLocation,
        bodySelection: sourceForm.bodySelection,
        timeZone: sourceForm.timeZone,
        options: { refraction, maxTimePoints }
      });
      const eventResults = eventDatesFor(sourceForm).flatMap((localDate) => calculateDailyEvents({
        observer: observerLocation,
        bodySelection: sourceForm.bodySelection,
        timeZone: sourceForm.timeZone,
        localDate,
        refraction
      }));
      const nextInsight = createDashboardInsight(resultRows, { imagingMode, nightStartDate: sourceForm.startDate });

      setRows(resultRows);
      setEvents(eventResults);
      setCalculationMeta({
        location: observerLocation,
        startLocal: `${sourceForm.startDate} ${sourceForm.startTime} ${sourceForm.timeZone}`,
        endLocal: endLocalLabel,
        intervalMinutes: exportInterval,
        rangeMode: sourceForm.rangeMode,
        refraction
      });
      setFocusedUtc(nextInsight.nightSummary?.effectiveWindow?.startUtc ?? nextInsight.bestWindow?.startUtc ?? resultRows[0]?.utcTime ?? null);
      setHoveredUtc(null);
      if (showMessages) setMessages(nextMessages);
      return true;
    } catch {
      setRows([]);
      setEvents([]);
      setCalculationMeta(null);
      if (showMessages) setMessages([...nextMessages, localT("calculationFailed")]);
      return false;
    }
  }

  function validateAndCalculate() {
    calculateWithForm(form, true);
  }

  function applyAnalysisMode(mode: AnalysisMode) {
    const nextForm = { ...form, ...analysisPatch(mode, form.startDate) };
    setAnalysisMode(mode);
    setRangePreset(mode === "night" ? "night" : mode === "multi" ? "7d" : "custom");
    setForm(nextForm);
    calculateWithForm(nextForm, false);
  }

  function applyNightDate(date: string) {
    const nextForm = { ...form, ...analysisPatch(analysisMode, date) };
    setForm(nextForm);
    calculateWithForm(nextForm, false);
  }

  function applyRangePreset(preset: RangePreset) {
    const presetConfig: Record<RangePreset, Partial<CalculationFormState>> = {
      night: { ...analysisPatch("night", form.startDate) },
      "3d": { rangeMode: "duration", startTime: "16:00", durationHours: "72", intervalPreset: "30", intervalMinutes: 30, customIntervalMinutes: "30" },
      "7d": { rangeMode: "duration", startTime: "16:00", durationHours: "168", intervalPreset: "30", intervalMinutes: 30, customIntervalMinutes: "30" },
      "14d": { rangeMode: "duration", startTime: "16:00", durationHours: "336", intervalPreset: "60", intervalMinutes: 60, customIntervalMinutes: "60" },
      "30d": { rangeMode: "duration", startTime: "16:00", durationHours: "720", intervalPreset: "60", intervalMinutes: 60, customIntervalMinutes: "60" },
      custom: {}
    };
    const nextForm = { ...form, ...presetConfig[preset] };
    setRangePreset(preset);
    setAnalysisMode(preset === "night" ? "night" : preset === "custom" ? "custom" : "multi");
    setForm(nextForm);
    calculateWithForm(nextForm, false);
  }

  function applyHeatmapDay(localDate: string) {
    const nextForm = {
      ...form,
      startDate: localDate,
      endDate: datePlusDays(localDate, 1),
      startTime: "16:00",
      rangeMode: "duration" as const,
      durationHours: "18",
      intervalPreset: "10",
      intervalMinutes: 10,
      customIntervalMinutes: "10"
    };
    setRangePreset("night");
    setAnalysisMode("night");
    setForm(nextForm);
    calculateWithForm(nextForm, false);
  }

  function jumpToTimeline() {
    document.getElementById("night-timeline")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function createMetadata() {
    if (!calculationMeta) return null;

    return createExportMetadata({
      language: form.language,
      locationName: form.locationName,
      location: calculationMeta.location,
      timeZone: form.timeZone,
      targetBodies: form.bodySelection,
      startLocal: calculationMeta.startLocal,
      endLocal: calculationMeta.endLocal,
      intervalMinutes: calculationMeta.intervalMinutes,
      rangeMode: calculationMeta.rangeMode,
      refraction: calculationMeta.refraction
    });
  }

  function handleTextDownload(kind: "csv" | "txt" | "md") {
    const metadata = createMetadata();
    if (!metadata) {
      setMessages([t("validationErrors")]);
      return;
    }

    const prefix = t("downloadPrefix");
    if (kind === "csv") downloadTextFile(filename(prefix, "csv"), exportCsv(rows, events, metadata, t), "text/csv");
    if (kind === "txt") downloadTextFile(filename(prefix, "txt"), exportTxt(rows, events, metadata, t), "text/plain");
    if (kind === "md") downloadTextFile(filename(prefix, "md"), exportMarkdown(rows, events, metadata, t), "text/markdown");
  }

  async function handleXlsxDownload() {
    const metadata = createMetadata();
    if (!metadata) {
      setMessages([t("validationErrors")]);
      return;
    }

    const buffer = await exportXlsx(rows, events, metadata, t);
    downloadBlob(
      filename(t("downloadPrefix"), "xlsx"),
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    );
  }

  function renderPositionSummary(body: "sun" | "moon") {
    const row = firstInstantRows.find((item) => item.body === body);
    if (!row) return null;

    return (
      <article className="summary-card">
        <h3>{body === "sun" ? t("currentSunPosition") : t("currentMoonPosition")}</h3>
        <span>{t("columnAzimuthDeg")}: {formatAngle(row.azimuthDeg)}</span>
        <span>{t("columnApparentAltitudeDeg")}: {formatAngle(row.apparentAltitudeDeg)}</span>
        <span>{t("columnGeometricAltitudeDeg")}: {formatAngle(row.geometricAltitudeDeg)}</span>
        {row.phaseName && <span>{t("columnPhaseName")}: {t(row.phaseName)}</span>}
        {row.warnings.length > 0 && <span>{row.warnings.map((warning) => formatWarning(warning, t)).join(", ")}</span>}
      </article>
    );
  }

  function renderEvents(body: "sun" | "moon") {
    const bodyEvents = events.filter((event) => event.body === body);
    if (bodyEvents.length === 0) return null;

    return (
      <article className="summary-card">
        <h3>{body === "sun" ? t("nextSunEvents") : t("nextMoonEvents")}</h3>
        {bodyEvents.map((event) => (
          <span key={`${event.body}-${event.kind}-${event.utcTime ?? event.localDate ?? "none"}`}>
            {formatEventKind(event.kind, t)}: {event.status === "found" ? `${event.localTime} ${event.timeZone}` : t("noEvent")}
          </span>
        ))}
      </article>
    );
  }

  return (
    <main className="app-shell">
      <section className="topbar card" aria-label={t("language")}>
        <div>
          <h1>{t("appTitle")}</h1>
          <p>{t("accuracyNotice")}</p>
          <details>
            <summary>{t("details")}</summary>
            <p>{t("definitionsHelp")}</p>
          </details>
        </div>
        <label className="inline-control">
          <Languages size={18} aria-hidden="true" />
          <span>{t("language")}</span>
          <select value={form.language} onChange={(event) => updateForm({ language: event.target.value as Language })}>
            <option value="de">{t("german")}</option>
            <option value="en">{t("english")}</option>
          </select>
        </label>
      </section>

      <section className="analysis-panel card" aria-label={t("analysisMode")}>
        <div className="analysis-copy">
          <span className="eyebrow"><Telescope size={18} aria-hidden="true" /> {t("astroNightCalculator")}</span>
          <h2>{t("analysisMode")}</h2>
          <p>{insight.nightSummary ? `${t("nightFrom")}: ${insight.nightSummary.nightLabel}` : t("analysisModeHint")}</p>
        </div>
        <div className="analysis-controls">
          <div className="analysis-mode-buttons" role="group" aria-label={t("analysisMode")}>
            {(["instant", "night", "multi", "custom"] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                className={analysisMode === mode ? "is-active" : ""}
                onClick={() => applyAnalysisMode(mode)}
              >
                {t(`analysisMode_${mode}` as TranslationKey)}
              </button>
            ))}
          </div>
          <label>{t("nightDate")}
            <input type="date" value={form.startDate} onChange={(event) => applyNightDate(event.target.value)} />
          </label>
          <label>{t("imagingMode")}
            <select value={imagingMode} onChange={(event) => setImagingMode(event.target.value as ImagingMode)}>
              <option value="strict">{t("imagingMode_strict")}</option>
              <option value="balanced">{t("imagingMode_balanced")}</option>
              <option value="bright">{t("imagingMode_bright")}</option>
            </select>
          </label>
        </div>
      </section>

      <AstroDashboard
        insight={insight}
        events={events}
        focusedSample={focusedSample}
        hoveredSample={hoveredSample}
        rangePreset={rangePreset}
        analysisMode={analysisMode}
        imagingMode={imagingMode}
        onRangePreset={applyRangePreset}
        onFocusUtc={setFocusedUtc}
        onHoverUtc={setHoveredUtc}
        onDaySelect={applyHeatmapDay}
        onJumpToTimeline={jumpToTimeline}
        t={t}
      />

      <section className="control-grid">
        <fieldset className="card">
          <legend>{t("bodySection")}</legend>
          <div className="segmented">
            {(["sun", "moon", "both"] as const).map((selection) => (
              <label key={selection}>
                <input type="radio" name="body" checked={form.bodySelection === selection} onChange={() => updateForm({ bodySelection: selection })} />
                <span>{t(selection)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="card location-card">
          <legend>{t("locationSection")}</legend>
          <section>
            <h2>{t("manualLocation")}</h2>
            <div className="field-row">
              <label>{t("locationName")}<input value={form.locationName} onChange={(event) => updateManualLocation({ locationName: event.target.value })} /></label>
              <label>{t("latitude")}<input value={form.latitude} inputMode="decimal" onChange={(event) => updateManualLocation({ latitude: event.target.value })} /></label>
              <label>{t("longitude")}<input value={form.longitude} inputMode="decimal" onChange={(event) => updateManualLocation({ longitude: event.target.value })} /></label>
              <label>{t("elevationMeters")}<input value={form.elevationMeters} inputMode="decimal" onChange={(event) => updateManualLocation({ elevationMeters: event.target.value })} /></label>
            </div>
          </section>

          <section>
            <h2>{t("geocodingLocation")}</h2>
            <label>{t("locationSearch")}
              <div className="search-row">
                <input value={searchQuery} placeholder={t("searchPlaceholder")} onChange={(event) => setSearchQuery(event.target.value)} />
                <button type="button" className="icon-button" onClick={handleSearch} disabled={isSearching}>
                  <Search size={17} aria-hidden="true" />{t("search")}
                </button>
              </div>
            </label>
            <label>{t("searchCountry")}
              <select value={form.searchCountryCode} onChange={(event) => updateForm({ searchCountryCode: event.target.value })}>
                {countryOptions().map((country) => <option key={country || "any"} value={country}>{country || t("countryAny")}</option>)}
              </select>
            </label>
            <p className="hint">{t("geocodingNotice")}</p>
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((result) => (
                  <button key={result.id} type="button" onClick={() => applyGeocodingResult(result)}>
                    <MapPin size={16} aria-hidden="true" />
                    <span>{result.name}, {result.admin1 ? `${result.admin1}, ` : ""}{result.country} ({result.latitude.toFixed(4)}, {result.longitude.toFixed(4)})</span>
                    <strong>{t("useResult")}</strong>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2>{t("savedLocations")}</h2>
            <p className="hint">{t("savedLocationsNotice")}</p>
            <div className="search-row">
              <input value={saveLocationName} placeholder={t("savedLocationNamePlaceholder")} onChange={(event) => setSaveLocationName(event.target.value)} />
              <button type="button" onClick={handleSaveCurrentLocation}><Save size={17} aria-hidden="true" />{t("saveCurrentLocation")}</button>
            </div>
            {savedLocations.length === 0 ? <p className="empty-state">{t("noSavedLocations")}</p> : (
              <div className="saved-list">
                {savedLocations.map((location) => (
                  <div key={location.id} className="saved-location">
                    <span><strong>{location.name}</strong> {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
                    <button type="button" onClick={() => handleApplySavedLocation(location)}>{t("applySavedLocation")}</button>
                    <button type="button" className="danger-button" onClick={() => handleDeleteSavedLocation(location.id)}><Trash2 size={16} aria-hidden="true" />{t("deleteSavedLocation")}</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2>{t("automaticLocation")}</h2>
            <button type="button" className="secondary-button wide" onClick={handleAutoDetect}><LocateFixed size={17} aria-hidden="true" />{t("autoDetect")}</button>
            {locationAccuracy !== null && <p className="hint">{t("geolocationAccuracy")}: {locationAccuracy.toFixed(0)} {t("meters")}</p>}
          </section>
        </fieldset>

        <fieldset className="card">
          <legend>{t("timeSection")}</legend>
          <div className="field-row">
            <label>{t("date")}<input type="date" value={form.startDate} onChange={(event) => updateForm({ startDate: event.target.value })} /></label>
            <label>{t("dateText")}<input value={form.startDate} onChange={(event) => updateForm({ startDate: event.target.value })} /></label>
            <label>{t("time")}<input type="time" value={form.startTime} onChange={(event) => updateForm({ startTime: event.target.value })} /></label>
          </div>
          <label>{t("timeZone")}
            <select value={form.timeZone} onChange={(event) => updateForm({ timeZone: event.target.value })}>
              {timeZones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </select>
          </label>
        </fieldset>

        <fieldset className="card">
          <legend>{t("rangeSection")}</legend>
          <div className="segmented">
            {(["single", "end", "duration"] as const).map((mode) => (
              <label key={mode}>
                <input type="radio" name="range" checked={form.rangeMode === mode} onChange={() => updateForm({ rangeMode: mode })} />
                <span>{mode === "single" ? t("singleInstant") : mode === "end" ? t("startEnd") : t("startDuration")}</span>
              </label>
            ))}
          </div>
          {form.rangeMode === "end" && (
            <div className="field-row">
              <label>{t("endDate")}<input type="date" value={form.endDate} onChange={(event) => updateForm({ endDate: event.target.value })} /></label>
              <label>{t("endTime")}<input type="time" value={form.endTime} onChange={(event) => updateForm({ endTime: event.target.value })} /></label>
            </div>
          )}
          {form.rangeMode === "duration" && <label>{t("durationHours")}<input value={form.durationHours} inputMode="decimal" onChange={(event) => updateForm({ durationHours: event.target.value })} /></label>}
          {form.rangeMode !== "single" && (
            <>
              <label>{t("interval")}
                <select value={form.intervalPreset} onChange={(event) => updateForm({ intervalPreset: event.target.value, intervalMinutes: Number(event.target.value) || form.intervalMinutes })}>
                  {intervalOptions.map((minutes) => <option key={minutes} value={String(minutes)}>{minutes} {t("minutes")}</option>)}
                  <option value="custom">{t("customInterval")}</option>
                </select>
              </label>
              {form.intervalPreset === "custom" && <label>{t("customIntervalMinutes")}<input value={form.customIntervalMinutes} inputMode="numeric" onChange={(event) => updateForm({ customIntervalMinutes: event.target.value })} /></label>}
            </>
          )}
        </fieldset>

        <fieldset className="card">
          <legend>{t("optionsSection")}</legend>
          <label>{t("refractionMode")}
            <select value={form.refractionMode} onChange={(event) => updateForm({ refractionMode: event.target.value as RefractionMode })}>
              <option value="none">{t("refractionNone")}</option>
              <option value="standard">{t("refractionStandard")}</option>
              <option value="custom">{t("refractionCustom")}</option>
            </select>
          </label>
          {form.refractionMode === "custom" && (
            <div className="field-row">
              <label>{t("pressureHpa")}<input value={form.pressureHpa} inputMode="decimal" onChange={(event) => updateForm({ pressureHpa: event.target.value })} /></label>
              <label>{t("temperatureC")}<input value={form.temperatureC} inputMode="decimal" onChange={(event) => updateForm({ temperatureC: event.target.value })} /></label>
            </div>
          )}
          <p className="hint">{t("nearHorizonWarning")}</p>
        </fieldset>
      </section>

      {messages.length > 0 && <section className="messages" aria-live="polite">{messages.map((message) => <p key={message}>{message}</p>)}</section>}

      <section className="actions card">
        <button type="button" className="primary-button" onClick={validateAndCalculate}><Calculator size={18} aria-hidden="true" />{t("calculate")}</button>
        {rows.length > 0 && (
          <>
            <button type="button" onClick={() => handleTextDownload("csv")}><Download size={17} aria-hidden="true" />{t("exportCsv")}</button>
            <button type="button" onClick={handleXlsxDownload}><FileSpreadsheet size={17} aria-hidden="true" />{t("exportXlsx")}</button>
            <button type="button" onClick={() => handleTextDownload("txt")}><FileText size={17} aria-hidden="true" />{t("exportTxt")}</button>
            <button type="button" onClick={() => handleTextDownload("md")}><Download size={17} aria-hidden="true" />{t("exportMarkdown")}</button>
          </>
        )}
      </section>

      {rows.length > 0 && (
        <section className="results-section card">
          <h2>{t("summarySection")}</h2>
          <div className="summary-grid">
            {renderPositionSummary("sun")}
            {renderPositionSummary("moon")}
            {renderEvents("sun")}
            {renderEvents("moon")}
          </div>
        </section>
      )}

      {solarSummaries.length > 0 && (
        <section className="results-section card">
          <h2>{t("twilightSummary")}</h2>
          <p className="hint">{t("twilightSummaryNote")}</p>
          <div className="phase-grid">
            {solarSummaries.map((summary) => (
              <div key={summary.localDate} className="phase-card">
                <strong>{summary.localDate}</strong>
                <span>{t("day")}: {summary.phases.day ?? t("notInRange")}</span>
                <span>{t("civilTwilight")}: {summary.phases.civilTwilight ?? t("notInRange")}</span>
                <span>{t("nauticalTwilight")}: {summary.phases.nauticalTwilight ?? t("notInRange")}</span>
                <span>{t("astronomicalTwilight")}: {summary.phases.astronomicalTwilight ?? t("notInRange")}</span>
                <span>{t("night")}: {summary.phases.night ?? t("notInRange")}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="results-section card">
        <h2>{t("results")}</h2>
        <ResultTable rows={sortedRows} t={t} />
      </section>

      <footer className="footer-note">{t("accuracyNotice")}</footer>
    </main>
  );
}
