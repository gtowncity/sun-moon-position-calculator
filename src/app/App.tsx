import { useEffect, useMemo, useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import type {
  CalculationFormState,
  EventResult,
  Language,
  ObserverLocation,
  RefractionSettings,
  ResultRow,
  SavedLocation,
  TargetBody,
  TimeRangeMode
} from "../types";
import { detectBrowserLanguage, getTranslator, isLanguage, type TranslationKey } from "../i18n";
import { calculateDailyEvents } from "../astro/events";
import { standardPressureHpa, standardTemperatureC } from "../astro/common/refraction";
import { calculatePositions } from "../lib/astronomy/calculator";
import { downloadBlob, downloadTextFile } from "../lib/export/download";
import { exportMarkdown } from "../lib/export/markdown";
import { createExportMetadata } from "../lib/export/metadata";
import { exportTxt } from "../lib/export/txt";
import { exportXlsx } from "../lib/export/xlsx";
import { localFallbackResults } from "../lib/geocoding/localFallback";
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
import { summarizeSolarPhases } from "../lib/solar/phases";
import { addHours, generateIntervalInstants, getNowParts, localDateTimeToInstant, maxTimePoints } from "../lib/time/dateTime";
import { getBrowserTimeZone, getSupportedTimeZones, isValidTimeZone } from "../lib/time/timeZones";
import { createDashboardInsight, findSample } from "./insights";
import { AstroDashboard, type AnalysisMode, type RangePreset } from "../components/AstroDashboard";
import { ControlPanel } from "../components/dashboard/ControlPanel";
import { DetailReport } from "../components/dashboard/DetailReport";
import { ResultDataGrid } from "../components/dashboard/ResultDataGrid";
import { TerminalAppFrame } from "../components/dashboard/TerminalAppFrame";
import type { ImagingMode } from "../domain/insights/effectiveImagingWindow";

const languageStorageKey = "solar-lunar-position-tool.language";

interface CalculationMeta {
  location: ObserverLocation;
  startLocal: string;
  endLocal: string;
  intervalMinutes: number | null;
  rangeMode: TimeRangeMode;
  refraction: RefractionSettings;
}

interface GeocodingDiagnostic {
  title: string;
  requestUrl?: string;
  errorName?: string;
  errorMessage?: string;
  timestamp?: string;
  hint: string;
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

function insightBodySelection(selection: TargetBody): TargetBody {
  return selection === "moon" ? "both" : selection;
}

function preferredFocusUtc(
  insight: ReturnType<typeof createDashboardInsight>,
  fallbackRows: ResultRow[]
): string | null {
  return insight.nightSummary?.effectiveWindow?.startUtc ??
    insight.bestWindow?.startUtc ??
    insight.samples[0]?.utcTime ??
    fallbackRows[0]?.utcTime ??
    null;
}

export function App() {
  const [form, setForm] = useState<CalculationFormState>(() => createInitialForm());
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [insightRows, setInsightRows] = useState<ResultRow[]>([]);
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
  const [geocodingDiagnostic, setGeocodingDiagnostic] = useState<GeocodingDiagnostic | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => safeLoadSavedLocations());
  const [saveLocationName, setSaveLocationName] = useState("");
  const [crtEnabled, setCrtEnabled] = useState(true);

  const t = useMemo(() => getTranslator(form.language), [form.language]);
  const timeZones = useMemo(() => getSupportedTimeZones(), []);
  const geocoder = useMemo(() => new OpenMeteoGeocodingProvider(), []);
  const insight = useMemo(() => createDashboardInsight(insightRows, { imagingMode, nightStartDate: form.startDate }), [form.startDate, imagingMode, insightRows]);
  const focusedSample = useMemo(() => findSample(insight.samples, focusedUtc), [focusedUtc, insight.samples]);
  const hoveredSample = useMemo(() => findSample(insight.samples, hoveredUtc), [hoveredUtc, insight.samples]);
  const solarSummaries = useMemo(() => summarizeSolarPhases(insightRows), [insightRows]);
  const firstInstantRows = useMemo(() => {
    const firstUtc = insightRows[0]?.utcTime;
    return firstUtc ? insightRows.filter((row) => row.utcTime === firstUtc) : [];
  }, [insightRows]);

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
      const geolocationKeys: TranslationKey[] = [
        "geolocationUnsupported",
        "geolocationDenied",
        "geolocationUnavailable",
        "geolocationTimeout",
        "geolocationUnknown"
      ];
      const message = error instanceof Error && geolocationKeys.includes(error.message as TranslationKey)
        ? t(error.message as TranslationKey)
        : t("partialAutoDetect");
      setMessages([message === t("partialAutoDetect") ? message : `${t("partialAutoDetect")} ${message}`]);
    }
  }

  async function handleSearch() {
    const trimmedQuery = searchQuery.trim();
    const fallbackResults = localFallbackResults(trimmedQuery);
    const countryCode = form.searchCountryCode || (/^\d+$/.test(trimmedQuery) ? "DE" : undefined);

    setIsSearching(true);
    setMessages([]);
    setSearchResults([]);
    setGeocodingDiagnostic(null);

    try {
      const results = await geocoder.search(trimmedQuery, form.language, countryCode);
      const nextResults = results.length === 0 && fallbackResults.length > 0 ? fallbackResults : results;
      setSearchResults(nextResults);
      if (results.length === 0 && fallbackResults.length > 0) {
        setMessages([t("noResults"), t("localFallbackAvailable")]);
      } else if (results.length === 0) {
        setMessages([t("noResults")]);
      } else if (results.length > 1) {
        setMessages([t("multipleResultsHint")]);
      }
    } catch (error) {
      if (error instanceof GeocodingHttpError) {
        setSearchResults(fallbackResults);
        setGeocodingDiagnostic({
          title: `${t("searchFailed")} HTTP ${error.status}`,
          requestUrl: error.requestUrl,
          errorName: `HTTP ${error.status}`,
          errorMessage: error.reason,
          timestamp: new Date().toISOString(),
          hint: t("geocodingDiagnosticHint")
        });
        setMessages([
          `${t("searchFailed")} HTTP ${error.status}: ${error.reason}`,
          ...(fallbackResults.length > 0 ? [t("localFallbackAvailable")] : [t("useManualCoordinatesHint")])
        ]);
      } else if (error instanceof GeocodingNetworkError) {
        setSearchResults(fallbackResults);
        setGeocodingDiagnostic({
          title: error.isTimeout ? t("searchTimeout") : t("networkSearchFailed"),
          requestUrl: error.requestUrl,
          errorName: error.originalErrorName,
          errorMessage: error.originalErrorMessage,
          timestamp: error.timestamp,
          hint: t("geocodingDiagnosticHint")
        });
        setMessages([
          error.isTimeout ? t("searchTimeout") : t("networkSearchFailed"),
          ...(fallbackResults.length > 0 ? [t("localFallbackAvailable")] : [t("useManualCoordinatesHint")])
        ]);
      } else {
        setMessages([t("searchFailed")]);
      }
    } finally {
      setIsSearching(false);
    }
  }

  function applyGeocodingResult(result: import("../types").GeocodingResult) {
    setGeocodingDiagnostic(null);
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
      setInsightRows([]);
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
      setInsightRows([]);
      setEvents([]);
      setCalculationMeta(null);
      if (showMessages) setMessages(nextMessages);
      return false;
    }

    try {
      const analysisRows = calculatePositions({
        instants,
        observer: observerLocation,
        bodySelection: insightBodySelection(sourceForm.bodySelection),
        timeZone: sourceForm.timeZone,
        options: { refraction, maxTimePoints }
      });
      const resultRows = sourceForm.bodySelection === "moon"
        ? analysisRows.filter((row) => row.body === "moon")
        : analysisRows;
      const eventResults = eventDatesFor(sourceForm).flatMap((localDate) => calculateDailyEvents({
        observer: observerLocation,
        bodySelection: insightBodySelection(sourceForm.bodySelection),
        timeZone: sourceForm.timeZone,
        localDate,
        refraction
      }));
      const nextInsight = createDashboardInsight(analysisRows, { imagingMode, nightStartDate: sourceForm.startDate });

      setRows(resultRows);
      setInsightRows(analysisRows);
      setEvents(eventResults);
      setCalculationMeta({
        location: observerLocation,
        startLocal: `${sourceForm.startDate} ${sourceForm.startTime} ${sourceForm.timeZone}`,
        endLocal: endLocalLabel,
        intervalMinutes: exportInterval,
        rangeMode: sourceForm.rangeMode,
        refraction
      });
      setFocusedUtc(preferredFocusUtc(nextInsight, analysisRows));
      setHoveredUtc(null);
      if (showMessages) setMessages(nextMessages);
      return true;
    } catch {
      setRows([]);
      setInsightRows([]);
      setEvents([]);
      setCalculationMeta(null);
      if (showMessages) setMessages([...nextMessages, localT("calculationFailed")]);
      return false;
    }
  }

  function validateAndCalculate() {
    calculateWithForm(form, true);
  }

  function handleImagingMode(nextMode: ImagingMode) {
    setImagingMode(nextMode);
    if (insightRows.length > 0) {
      const nextInsight = createDashboardInsight(insightRows, { imagingMode: nextMode, nightStartDate: form.startDate });
      setFocusedUtc(preferredFocusUtc(nextInsight, insightRows));
      setHoveredUtc(null);
    }
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

    const metadata = createExportMetadata({
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

    if (form.bodySelection === "moon") {
      return {
        ...metadata,
        accuracyNote: `${metadata.accuracyNote} ${t("moonOnlyInternalSunMetadata")}`
      };
    }

    return metadata;
  }

  function handleTextDownload(kind: "txt" | "md") {
    const metadata = createMetadata();
    if (!metadata) {
      setMessages([t("validationErrors")]);
      return;
    }

    const prefix = t("downloadPrefix");
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

  const statusItems = [
    t("ready"),
    `${t("locationStatus")}: ${(form.locationName || t("manualLocation")).toUpperCase()}`,
    `TZ: ${form.timeZone}`,
    `${t("modeStatus")}: ${t(`analysisMode_${analysisMode}` as TranslationKey).toUpperCase()}`,
    `${t("nightStatus")}: ${insight.nightSummary?.nightLabel ?? form.startDate}`,
    `${t("rows")}: ${rows.length}`,
    `CRT FX: ${crtEnabled ? "ON" : "OFF"}`
  ];

  return (
    <TerminalAppFrame
      language={form.language}
      onLanguageChange={(language: Language) => updateForm({ language })}
      crtEnabled={crtEnabled}
      onToggleCrt={() => setCrtEnabled((enabled) => !enabled)}
      statusItems={statusItems}
      t={t}
    >
      <ControlPanel
        form={form}
        analysisMode={analysisMode}
        imagingMode={imagingMode}
        rangePreset={rangePreset}
        timeZones={timeZones}
        searchQuery={searchQuery}
        searchResults={searchResults}
        geocodingDiagnostic={geocodingDiagnostic}
        savedLocations={savedLocations}
        saveLocationName={saveLocationName}
        isSearching={isSearching}
        locationAccuracy={locationAccuracy}
        messages={messages}
        onUpdateForm={updateForm}
        onUpdateManualLocation={updateManualLocation}
        onAnalysisMode={applyAnalysisMode}
        onNightDate={applyNightDate}
        onRangePreset={applyRangePreset}
        onImagingMode={handleImagingMode}
        onSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        onApplyGeocodingResult={applyGeocodingResult}
        onAutoDetect={handleAutoDetect}
        onSaveLocationName={setSaveLocationName}
        onSaveCurrentLocation={handleSaveCurrentLocation}
        onApplySavedLocation={handleApplySavedLocation}
        onDeleteSavedLocation={handleDeleteSavedLocation}
        onCalculate={validateAndCalculate}
        t={t}
      />

      <AstroDashboard
        insight={insight}
        events={events}
        focusedSample={focusedSample}
        hoveredSample={hoveredSample}
        rangePreset={rangePreset}
        analysisMode={analysisMode}
        targetBody={form.bodySelection}
        imagingMode={imagingMode}
        language={form.language}
        onRangePreset={applyRangePreset}
        onFocusUtc={setFocusedUtc}
        onHoverUtc={setHoveredUtc}
        onDaySelect={applyHeatmapDay}
        onJumpToTimeline={jumpToTimeline}
        t={t}
      />

      <DetailReport
        events={events}
        firstInstantRows={firstInstantRows}
        solarSummaries={solarSummaries}
        onFocusUtc={setFocusedUtc}
        t={t}
      />

      <ResultDataGrid
        rows={rows}
        focusedUtc={focusedUtc}
        onXlsx={handleXlsxDownload}
        onTxt={() => handleTextDownload("txt")}
        onMarkdown={() => handleTextDownload("md")}
        t={t}
      />

      <footer className="footer-note">{t("accuracyNotice")}</footer>
    </TerminalAppFrame>
  );
}
