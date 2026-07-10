import { useEffect, useMemo, useState, type MouseEvent } from "react";
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
import {
  deleteDsoLocationProfile,
  loadDefaultDsoLocationProfile,
  loadDsoLocationProfiles,
  saveDsoLocationProfile,
  setDefaultDsoLocationProfile,
  type StoredDsoLocationProfile
} from "../storage/dsoLocationStorage";
import { generateDsoSessionPlan } from "../session/generateDsoSessionPlan";
import { emptyCalendarOverrides, type CalendarOverrides, type CombinedWindow, type SessionAllocationMode, type SessionPlan, type SessionTarget } from "../session/sessionTypes";
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
type CalendarAction = "show" | "include" | "remove" | "prefer" | "exclude" | "reset";

const dsoText = {
  en: {
    title: "DSO Session Planner",
    calculate: "Calculate session",
    noPlan: "No DSO session calculated yet.",
    invalidLocation: "Please enter valid DSO coordinates.",
    invalidRange: "Please choose a valid date range."
  },
  de: {
    title: "DSO Session Planner",
    calculate: "Session neu berechnen",
    noPlan: "Noch keine DSO-Session berechnet.",
    invalidLocation: "Bitte gueltige Koordinaten im DSO-Standortbereich eingeben.",
    invalidRange: "Bitte einen gueltigen Zeitraum waehlen."
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
    locationName: state.locationName || "Manueller Standort",
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

function filename(prefix: string, extension: string): string {
  return `${prefix}.${extension}`;
}

function windowKey(window: DsoWindow): string {
  return `${window.nightLabel}-${window.startUtc}-${window.endUtc}`;
}

function objectName(object: DeepSkyObject): string {
  return object.germanName ? `${object.id} ${object.germanName}` : `${object.id} ${object.primaryName}`;
}

function objectDifficultyLabel(object: DeepSkyObject): string {
  const moon = Math.round(object.planningProfile.moonSensitivity * 100);
  return `${object.planningProfile.broadbandDifficulty} / Mond ${moon}%`;
}

function categoryMeaning(category: DsoCategory): string {
  switch (category) {
    case "MAIN":
      return "beste Hauptdaten, bevorzugt stacken";
    case "EXTRA":
      return "brauchbare Zusatzdaten";
    case "TEST":
      return "nur Testdaten oder helle Ziele";
    case "BAD":
      return "nicht sinnvoll aufnehmen";
  }
}

function humanCategory(category: DsoCategory): string {
  return `${category} - ${categoryMeaning(category)}`;
}

function humanizeReason(reason: string): string {
  if (reason.includes("Moon is bright and close enough")) return "Der Mond ist hell und nah genug am Ziel, um sichtbare Gradienten zu verursachen.";
  if (reason.includes("Low target altitude")) return "Das Objekt steht niedrig. Dadurch steigt die Airmass und die Bildqualitaet wird schwaecher.";
  if (reason.includes("Weak broadband target")) return "Der Himmel ist fuer dieses schwache Breitband-Objekt noch zu hell.";
  if (reason.includes("Target below usable altitude") || reason.includes("Target never reaches usable altitude")) return "Das Objekt steht unter der sinnvoll nutzbaren Hoehe.";
  if (reason.includes("No astronomical night interval")) return "In diesem Zeitraum gibt es keine echte astronomische Nacht.";
  if (reason.includes("Moon below horizon")) return "Der Mond ist unter dem Horizont und stoert dieses Fenster kaum.";
  if (reason.includes("Moon") && reason.includes("high")) return "Der Mond steht hoch und kann den Kontrast sichtbar verschlechtern.";
  if (reason.includes("bright astronomical twilight")) return "Die Daemmerung ist noch zu hell fuer saubere Hauptdaten.";
  if (reason.includes("Broadband galaxy details")) return "Galaxien-Details brauchen besonders dunklen, mondarmen Himmel.";
  if (reason.includes("Sun")) return reason.replace("Sun", "Sonne").replace("target", "Ziel").replace("deg", "Grad");
  return reason;
}

function humanizeReasonList(reasons: string[], limit = 3): string {
  return reasons.slice(0, limit).map(humanizeReason).join("; ") || "-";
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

function qualityExplanation(id: QualityProfileId): { title: string; body: string; details: string[] } {
  if (id === "strict") {
    return {
      title: "Streng. Nur sehr gute Bedingungen.",
      body: "Weniger Fenster, dafuer bessere Daten. Gut fuer schwache Galaxien, Reflexionsnebel und saubere Breitbanddaten.",
      details: ["hoeherer Mindeststand des Objekts", "strengere Mondbewertung", "strengere Daemmerungsbewertung", "hoehere Score-Schwellen fuer MAIN"]
    };
  }
  if (id === "aggressive") {
    return {
      title: "Mehr Zeitfenster. Nimmt auch schwaechere Bedingungen mit.",
      body: "Gut zum Testen oder wenn wenige klare Naechte verfuegbar sind. EXTRA/TEST wird frueher zugelassen.",
      details: ["niedrigere Score-Schwellen", "etwas toleranter gegen Mondlicht", "etwas toleranter bei Zielhoehe", "mehr TEST/EXTRA-Fenster"]
    };
  }
  return {
    title: "Ausgewogen. Gute Mischung aus Qualitaet und nutzbarer Zeit.",
    body: "Der Standard fuer normale DSO-Planung mit Breitband-Setup.",
    details: ["MAIN bleibt hochwertig", "EXTRA ist nutzbar, aber sichtbar kompromissbehaftet", "Mond und Daemmerung werden konservativ gewichtet"]
  };
}

function locationToProfile(
  profile: StoredDsoLocationProfile,
  setters: {
    setLocationName: (value: string) => void;
    setLatitude: (value: string) => void;
    setLongitude: (value: string) => void;
    setElevationMeters: (value: string) => void;
    setTimeZone: (value: string) => void;
    setBortle: (value: string) => void;
    setSqm: (value: string) => void;
  }
): void {
  setters.setLocationName(profile.name);
  setters.setLatitude(String(profile.latitude));
  setters.setLongitude(String(profile.longitude));
  setters.setElevationMeters(String(profile.elevationMeters));
  setters.setTimeZone(profile.timeZone);
  setters.setBortle(profile.bortle === undefined ? "" : String(profile.bortle));
  setters.setSqm(profile.sqm === undefined ? "" : String(profile.sqm));
}

function buildSessionMarkdown(plan: SessionPlan): string {
  const lines = [
    "# DSO Session",
    "",
    `Erstellt UTC: ${plan.generatedAtUtc}`,
    `Verteilung: ${plan.allocationMode}`,
    `Gesamtziel effektiv: ${formatMinutesCompact(plan.totals.targetEffectiveMinutes)}`,
    `Geplant effektiv: ${formatMinutesCompact(plan.totals.plannedEffectiveMinutes)}`,
    `Echte Aufnahmezeit: ${formatMinutesCompact(plan.totals.realDurationMinutes)}`,
    "",
    "| Objekt | Wunsch effektiv | Geplant effektiv | Echt | Status | Fenster |",
    "| --- | ---: | ---: | ---: | --- | ---: |",
    ...plan.objectPlans.map((entry) =>
      `| ${entry.object.id} ${entry.object.primaryName} | ${formatMinutesCompact(entry.targetEffectiveMinutes)} | ${formatMinutesCompact(entry.effectiveDurationMinutes)} | ${formatMinutesCompact(entry.realDurationMinutes)} | ${entry.reached ? "erreicht" : "offen"} | ${entry.selectedWindows.length} |`
    )
  ];
  return `${lines.join("\n")}\n`;
}

function buildSessionText(plan: SessionPlan): string {
  return [
    "DSO Session",
    `Erstellt UTC: ${plan.generatedAtUtc}`,
    `Gesamtziel effektiv: ${formatMinutesCompact(plan.totals.targetEffectiveMinutes)}`,
    `Geplant effektiv: ${formatMinutesCompact(plan.totals.plannedEffectiveMinutes)}`,
    `Echte Aufnahmezeit: ${formatMinutesCompact(plan.totals.realDurationMinutes)}`,
    "",
    ...plan.objectPlans.map((entry) =>
      `${entry.object.id} ${entry.object.primaryName}: Wunsch ${formatMinutesCompact(entry.targetEffectiveMinutes)}, geplant ${formatMinutesCompact(entry.effectiveDurationMinutes)}, echt ${formatMinutesCompact(entry.realDurationMinutes)}, ${entry.reached ? "erreicht" : "offen"}`
    )
  ].join("\n");
}

export function DsoPlannerPage(props: DsoPlannerPageProps) {
  const text = dsoText[props.language];
  const stored = typeof localStorage === "undefined" ? null : loadLastDsoSettings();
  const defaultLocation = typeof localStorage === "undefined" ? null : loadDefaultDsoLocationProfile();
  const initialStartDate = stored?.startDate ?? props.startDate;
  const initialObjectId = stored?.objectId ?? "M31";
  const initialTargetHours = stored?.targetEffectiveHours ?? 6;
  const [locationProfiles, setLocationProfiles] = useState<StoredDsoLocationProfile[]>(() => loadDsoLocationProfiles());
  const [selectedLocationProfileId, setSelectedLocationProfileId] = useState(defaultLocation?.id ?? "");
  const [locationName, setLocationName] = useState(defaultLocation?.name ?? stored?.locationName ?? (props.locationName || "Berlin"));
  const [latitude, setLatitude] = useState(String(defaultLocation?.latitude ?? stored?.location?.latitude ?? props.latitude));
  const [longitude, setLongitude] = useState(String(defaultLocation?.longitude ?? stored?.location?.longitude ?? props.longitude));
  const [elevationMeters, setElevationMeters] = useState(String(defaultLocation?.elevationMeters ?? stored?.location?.elevationMeters ?? props.elevationMeters));
  const [timeZone, setTimeZone] = useState(defaultLocation?.timeZone ?? stored?.timeZone ?? props.timeZone);
  const [locationQuery, setLocationQuery] = useState(stored?.locationName ?? props.locationName ?? "Berlin");
  const [locationMessage, setLocationMessage] = useState("");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(stored?.endDate ?? addDays(initialStartDate, 21));
  const [intervalMinutes, setIntervalMinutes] = useState(stored?.intervalMinutes ?? 10);
  const [weekendOnly, setWeekendOnly] = useState(stored?.weekendOnly ?? false);
  const [forceDates, setForceDates] = useState(stored?.exceptions?.forceInclude?.join("\n") ?? "");
  const [excludeDates, setExcludeDates] = useState(stored?.exceptions?.exclude?.join("\n") ?? "");
  const [objectId, setObjectId] = useState(initialObjectId);
  const [objectQuery, setObjectQuery] = useState(initialObjectId);
  const [sessionTargets, setSessionTargets] = useState<SessionTarget[]>([
    { id: `target-${initialObjectId}`, objectId: initialObjectId, targetEffectiveHours: initialTargetHours, priority: 1, enabled: true, isPrimary: true }
  ]);
  const [allocationMode, setAllocationMode] = useState<SessionAllocationMode>("equal");
  const [setupProfiles] = useState(() => uniqueById(loadDsoSetupProfiles()));
  const [setupProfileId, setSetupProfileId] = useState(stored?.setupProfile?.id ?? defaultDsoSetupProfile.id);
  const [qualityId, setQualityId] = useState<QualityProfileId>((stored?.qualityProfile?.id ?? loadLastQualityProfileId()) as QualityProfileId);
  const [mode, setMode] = useState<PlannerMode>(stored?.mode ?? "targetHours");
  const [targetEffectiveHours, setTargetEffectiveHours] = useState(String(stored?.targetEffectiveHours ?? 18));
  const [bortle, setBortle] = useState(String(defaultLocation?.bortle ?? stored?.bortle ?? 4.6));
  const [sqm, setSqm] = useState(String(defaultLocation?.sqm ?? stored?.sqm ?? 21.0));
  const [favorites, setFavorites] = useState<string[]>(() => loadFavoriteMessierObjects());
  const [messages, setMessages] = useState<string[]>([]);
  const [plan, setPlan] = useState<DsoPlan | null>(null);
  const [sessionPlan, setSessionPlan] = useState<SessionPlan | null>(null);
  const [showIntervals, setShowIntervals] = useState(false);
  const [selectedNightDate, setSelectedNightDate] = useState<string | null>(null);
  const [calendarOverrides, setCalendarOverrides] = useState<CalendarOverrides>(() => emptyCalendarOverrides());
  const [autoRecalculate, setAutoRecalculate] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ date: string; x: number; y: number; mobile: boolean } | null>(null);
  const [framingMessage, setFramingMessage] = useState("");

  const selectedObject = useMemo(() => messierCatalog.find((object) => object.id === objectId) ?? messierCatalog[30], [objectId]);
  const sessionObjects = useMemo(() => sessionTargets.map((target) => messierCatalog.find((object) => object.id === target.objectId)).filter((object): object is DeepSkyObject => Boolean(object)), [sessionTargets]);
  const primaryTarget = useMemo(() => sessionTargets.find((target) => target.isPrimary) ?? sessionTargets[0], [sessionTargets]);
  const primaryObject = useMemo(() => messierCatalog.find((object) => object.id === primaryTarget?.objectId) ?? selectedObject, [primaryTarget, selectedObject]);
  const setupProfile = useMemo(
    () => setupProfiles.find((profile) => profile.id === setupProfileId) ?? fallbackDsoSetupProfile,
    [setupProfileId, setupProfiles]
  );
  const searchResults = useMemo(() => searchMessierObjects(objectQuery, 12), [objectQuery]);
  const fieldOfView = setupFieldOfView(setupProfile);
  const pixelScale = setupPixelScaleArcSec(setupProfile);
  const qualityInfo = qualityExplanation(qualityId);
  const isTargetHoursMode = mode === "targetHours";
  const selectedWindows = useMemo(() => sessionPlan?.combinedWindows.filter((window) => window.includeInTotals) ?? [], [sessionPlan]);
  const selectedWindowKeys = useMemo(() => new Set(selectedWindows.map(windowKey)), [selectedWindows]);
  const calendarDayMap = useMemo(() => new Map(sessionPlan?.calendarDays.map((day) => [day.date, day]) ?? []), [sessionPlan]);
  const focusedNight = plan?.nights.find((night) => night.dateStart === selectedNightDate) ?? plan?.nights[0] ?? null;
  const windowsForDisplay = sessionPlan
    ? selectedWindows.length > 0
      ? selectedWindows
      : sessionPlan.combinedWindows.filter((window) => window.category !== "BAD").slice(0, 40)
    : [];

  useEffect(() => {
    function close(event: KeyboardEvent | globalThis.MouseEvent) {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      setContextMenu(null);
    }
    window.addEventListener("keydown", close);
    window.addEventListener("click", close);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("click", close);
    };
  }, []);

  useEffect(() => {
    if (!autoRecalculate || !sessionPlan) return;
    setIsRecalculating(true);
    const timer = window.setTimeout(() => {
      calculate(true);
    }, 500);
    return () => {
      window.clearTimeout(timer);
      setIsRecalculating(false);
    };
  }, [
    locationName,
    latitude,
    longitude,
    elevationMeters,
    timeZone,
    startDate,
    endDate,
    intervalMinutes,
    weekendOnly,
    forceDates,
    excludeDates,
    setupProfileId,
    qualityId,
    mode,
    targetEffectiveHours,
    bortle,
    sqm,
    allocationMode,
    JSON.stringify(sessionTargets),
    JSON.stringify(calendarOverrides)
  ]);

  function makeBaseSettings(): DsoPlannerSettings | null {
    const coordinates = validateCoordinates(latitude, longitude, elevationMeters);
    if (!coordinates.location) {
      setMessages([text.invalidLocation]);
      return null;
    }
    if (Temporal.PlainDate.compare(Temporal.PlainDate.from(endDate), Temporal.PlainDate.from(startDate)) < 0) {
      setMessages([text.invalidRange]);
      return null;
    }

    return buildSettings(coordinates.location, {
      locationName: locationName || "Manueller Standort",
      timeZone: timeZone || "Europe/Berlin",
      startDate,
      endDate,
      intervalMinutes,
      weekendOnly,
      objectId: primaryObject.id,
      setupProfile,
      qualityId,
      mode,
      targetEffectiveHours,
      forceDates,
      excludeDates,
      bortle,
      sqm
    });
  }

  function calculate(silent = false) {
    const baseSettings = makeBaseSettings();
    if (!baseSettings) {
      setPlan(null);
      setSessionPlan(null);
      setIsRecalculating(false);
      return;
    }

    try {
      const totalTargetHours = parseDecimalNumber(targetEffectiveHours, { required: false }) ?? 0;
      const activeTargets = sessionTargets.filter((target) => target.enabled);
      const requestTargets = activeTargets.length > 0 ? activeTargets : sessionTargets.slice(0, 1);
      const nextSessionPlan = generateDsoSessionPlan({
        baseSettings,
        targets: requestTargets,
        allocationMode,
        totalTargetEffectiveHours: isTargetHoursMode ? totalTargetHours : requestTargets.reduce((sum, target) => sum + target.targetEffectiveHours, 0),
        calendarOverrides
      });
      const primary = nextSessionPlan.objectPlans.find((entry) => entry.target.id === primaryTarget?.id) ?? nextSessionPlan.objectPlans[0];
      const exportPlan = generateDsoPlan({
        ...baseSettings,
        objectId: primary?.object.id ?? primaryObject.id,
        targetEffectiveHours: primary?.targetEffectiveMinutes ? primary.targetEffectiveMinutes / 60 : totalTargetHours
      });
      saveLastDsoSettings(baseSettings);
      setSessionPlan(nextSessionPlan);
      setPlan(exportPlan);
      setSelectedNightDate((current) => current ?? nextSessionPlan.calendarDays[0]?.date ?? null);
      setMessages(nextSessionPlan.warnings.slice(0, 6).map(humanizeReason));
    } catch (error) {
      setMessages([error instanceof Error ? humanizeReason(error.message) : "Die DSO-Berechnung ist fehlgeschlagen."]);
      setPlan(null);
      setSessionPlan(null);
    } finally {
      if (!silent) setIsRecalculating(false);
      window.setTimeout(() => setIsRecalculating(false), 120);
    }
  }

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
      setLocationMessage("Ort gefunden. Bitte Ergebnis pruefen; es wird nichts automatisch gespeichert.");
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : "Ortssuche fehlgeschlagen. Bitte Koordinaten manuell eingeben.");
    } finally {
      setIsSearchingLocation(false);
    }
  }

  function saveCurrentLocation(asDefault = false) {
    const coordinates = validateCoordinates(latitude, longitude, elevationMeters);
    if (!coordinates.location) {
      setLocationMessage("Standort konnte nicht gespeichert werden: Koordinaten sind ungueltig.");
      return;
    }
    const saved = saveDsoLocationProfile({
      id: selectedLocationProfileId || undefined,
      name: locationName || "DSO Standort",
      latitude: coordinates.location.latitude,
      longitude: coordinates.location.longitude,
      elevationMeters: coordinates.location.elevationMeters ?? 0,
      timeZone: timeZone || "Europe/Berlin",
      bortle: parseDecimalNumber(bortle, { required: false }) ?? undefined,
      sqm: parseDecimalNumber(sqm, { required: false }) ?? undefined,
      isDefault: asDefault
    });
    setLocationProfiles(loadDsoLocationProfiles());
    setSelectedLocationProfileId(saved.id);
    setLocationMessage(asDefault ? "Standort gespeichert und als Standard gesetzt." : "Standort gespeichert.");
  }

  function loadSelectedLocation() {
    const profile = locationProfiles.find((entry) => entry.id === selectedLocationProfileId);
    if (!profile) return;
    locationToProfile(profile, { setLocationName, setLatitude, setLongitude, setElevationMeters, setTimeZone, setBortle, setSqm });
    setLocationMessage("Gespeicherter Standort geladen.");
  }

  function deleteSelectedLocation() {
    if (!selectedLocationProfileId) return;
    deleteDsoLocationProfile(selectedLocationProfileId);
    setLocationProfiles(loadDsoLocationProfiles());
    setSelectedLocationProfileId("");
    setLocationMessage("Gespeicherter Standort geloescht.");
  }

  function setSelectedLocationDefault() {
    if (selectedLocationProfileId) {
      setDefaultDsoLocationProfile(selectedLocationProfileId);
      setLocationProfiles(loadDsoLocationProfiles());
      setLocationMessage("Standort als Standard gesetzt.");
      return;
    }
    saveCurrentLocation(true);
  }

  function addSessionTarget(object = selectedObject) {
    if (sessionTargets.some((target) => target.objectId === object.id)) {
      setObjectId(object.id);
      return;
    }
    const nextPriority = sessionTargets.length + 1;
    setSessionTargets((targets) => [
      ...targets,
      {
        id: `target-${object.id}-${Date.now()}`,
        objectId: object.id,
        targetEffectiveHours: Number.parseFloat(targetEffectiveHours) > 0 ? Number.parseFloat(targetEffectiveHours) / Math.max(1, targets.length + 1) : 4,
        priority: nextPriority,
        enabled: true,
        isPrimary: targets.length === 0
      }
    ]);
    setObjectId(object.id);
    setObjectQuery(object.id);
  }

  function updateTarget(id: string, patch: Partial<SessionTarget>) {
    setSessionTargets((targets) => targets.map((target) => target.id === id ? { ...target, ...patch } : target));
  }

  function removeTarget(id: string) {
    setSessionTargets((targets) => {
      const remaining = targets.filter((target) => target.id !== id);
      if (remaining.length === 0) return targets;
      if (!remaining.some((target) => target.isPrimary)) {
        return remaining.map((target, index) => ({ ...target, isPrimary: index === 0, priority: index + 1 }));
      }
      return remaining.map((target, index) => ({ ...target, priority: index + 1 }));
    });
  }

  function markPrimaryTarget(id: string) {
    setSessionTargets((targets) => targets.map((target) => ({ ...target, isPrimary: target.id === id })));
  }

  function updateOverride(date: string, updater: (current: CalendarOverrides) => CalendarOverrides) {
    setCalendarOverrides((current) => updater(current));
    setContextMenu(null);
    setSelectedNightDate(date);
  }

  function removeDate(values: string[], date: string): string[] {
    return values.filter((entry) => entry !== date);
  }

  function addDate(values: string[], date: string): string[] {
    return values.includes(date) ? values : [...values, date];
  }

  function applyCalendarAction(date: string, action: CalendarAction) {
    if (action === "show") {
      setSelectedNightDate(date);
      setContextMenu(null);
      return;
    }
    updateOverride(date, (current) => {
      const clean: CalendarOverrides = {
        includeInTotalsDates: removeDate(current.includeInTotalsDates, date),
        excludeFromTotalsDates: removeDate(current.excludeFromTotalsDates, date),
        preferredDates: removeDate(current.preferredDates, date),
        previewOnlyDates: removeDate(current.previewOnlyDates, date)
      };
      if (action === "include") return { ...clean, includeInTotalsDates: addDate(clean.includeInTotalsDates, date) };
      if (action === "remove") return { ...clean, previewOnlyDates: addDate(clean.previewOnlyDates, date) };
      if (action === "prefer") return { ...clean, preferredDates: addDate(clean.preferredDates, date) };
      if (action === "exclude") return { ...clean, excludeFromTotalsDates: addDate(clean.excludeFromTotalsDates, date) };
      return clean;
    });
  }

  function toggleCalendarTotal(date: string, currentlyCounts: boolean) {
    applyCalendarAction(date, currentlyCounts ? "remove" : "include");
  }

  function exportTxt() {
    if (plan) downloadTextFile(filename(`dso-active-object-${plan.object.id}`, "txt"), exportDsoText(plan), "text/plain");
  }

  function exportMarkdownFile() {
    if (plan) downloadTextFile(filename(`dso-active-object-${plan.object.id}`, "md"), exportDsoMarkdown(plan), "text/markdown");
  }

  async function exportXlsxFile() {
    if (!plan) return;
    const buffer = await exportDsoXlsx(plan);
    downloadBlob(
      filename(`dso-active-object-${plan.object.id}`, "xlsx"),
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    );
  }

  function exportSessionMarkdownFile() {
    if (sessionPlan) downloadTextFile(filename("dso-session", "md"), buildSessionMarkdown(sessionPlan), "text/markdown");
  }

  function exportSessionTextFile() {
    if (sessionPlan) downloadTextFile(filename("dso-session", "txt"), buildSessionText(sessionPlan), "text/plain");
  }

  function planForWindow(window: DsoWindow): DsoPlan | null {
    if (sessionPlan && "targetId" in window) {
      return sessionPlan.objectPlans.find((entry) => entry.object.id === window.objectId)?.plan ?? plan;
    }
    return plan;
  }

  function renderWhyWindow(window: DsoWindow) {
    const sourcePlan = planForWindow(window);
    if (!sourcePlan) return null;
    const interval = findRepresentativeInterval(sourcePlan, window);
    return (
      <details className="dso-why-box">
        <summary>Warum diese Bewertung?</summary>
        <p>
          Dieses Fenster ist <strong>{window.category}</strong>, weil Sonne, Mond, Zielhoehe und Setup zusammen einen Score von etwa {formatNumber(window.averageScore, 0)} ergeben.
          {window.category === "EXTRA" && " Es ist brauchbar, aber nicht sauber genug fuer MAIN."}
          {window.selectedForTarget && " Dieses Fenster wurde fuer das Belichtungsziel ausgewaehlt."}
        </p>
        <dl className="terminal-report dso-why-grid">
          <dt>Sonnenhoehe</dt><dd>{formatNumber(window.averageSunAltitude)} Grad</dd>
          <dt>Daemmerung</dt><dd>{interval?.twilightClass ?? "-"}</dd>
          <dt>Mondhoehe</dt><dd>{formatNumber(window.averageMoonAltitude)} Grad</dd>
          <dt>Mondbeleuchtung</dt><dd>{formatNumber(window.averageMoonIllumination, 0)}%</dd>
          <dt>Mondabstand</dt><dd>{formatNumber(window.averageMoonDistance, 0)} Grad</dd>
          <dt>Zielhoehe</dt><dd>{formatNumber(window.averageTargetAltitude)} Grad</dd>
          <dt>Airmass</dt><dd>{interval?.targetAirmassApprox ? formatNumber(interval.targetAirmassApprox, 2) : "-"}</dd>
          <dt>Score Sonne</dt><dd>{interval ? formatNumber(interval.sunScore, 0) : "-"}</dd>
          <dt>Score Mond</dt><dd>{interval ? formatNumber(interval.moonScore, 0) : "-"}</dd>
          <dt>Score Zielhoehe</dt><dd>{interval ? formatNumber(interval.targetAltitudeScore, 0) : "-"}</dd>
          <dt>Finaler Score</dt><dd>{formatNumber(window.averageScore, 0)}</dd>
          <dt>Kategorie</dt><dd>{humanCategory(window.category)}</dd>
          <dt>Echte Dauer</dt><dd>{formatMinutesCompact(window.durationMinutes)}</dd>
          <dt>Effektive Dauer</dt><dd>{formatMinutesCompact(window.effectiveDurationMinutes)}</dd>
        </dl>
        <p className="compact-hint">{humanizeReasonList([...window.warningsSummary, ...window.reasonsSummary], 4)}</p>
      </details>
    );
  }

  function renderContextMenu() {
    if (!contextMenu) return null;
    const style = contextMenu.mobile ? undefined : { left: contextMenu.x, top: contextMenu.y };
    return (
      <div className={`dso-context-menu ${contextMenu.mobile ? "is-mobile" : ""}`} style={style} role="menu" onClick={(event) => event.stopPropagation()}>
        <strong>Kalendernacht</strong>
        <button type="button" onClick={() => applyCalendarAction(contextMenu.date, "show")}>Nacht anzeigen</button>
        <button type="button" onClick={() => applyCalendarAction(contextMenu.date, "include")}>Ins Gesamtergebnis einbeziehen</button>
        <button type="button" onClick={() => applyCalendarAction(contextMenu.date, "remove")}>Aus Gesamtergebnis entfernen</button>
        <button type="button" onClick={() => applyCalendarAction(contextMenu.date, "prefer")}>Fuer Zielbelichtung bevorzugen</button>
        <button type="button" onClick={() => applyCalendarAction(contextMenu.date, "exclude")}>Nacht ausschliessen</button>
        <button type="button" onClick={() => applyCalendarAction(contextMenu.date, "reset")}>Auswahl zuruecksetzen</button>
      </div>
    );
  }

  function renderCalendar() {
    if (!sessionPlan) return null;
    const months = uniqueMonths(startDate, endDate);
    return (
      <section className="dso-calendar dso-card-section" id="dso-calendar">
        <div className="dso-section-heading">
          <div className="terminal-section-title">[Kalender]</div>
          <span className="compact-hint">Linksklick zeigt Details. Checkbox entscheidet, ob die Nacht ins Gesamtergebnis zaehlt.</span>
        </div>
        <div className="dso-calendar-legend">
          <span className="legend-quality">Qualitaet</span>
          <span className="legend-selection">Auswahlstatus</span>
          <span className="legend-total">zaehlt / nur Vorschau</span>
          <span className="legend-data">MAIN / EXTRA / TEST</span>
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
                    const day = calendarDayMap.get(date);
                    const counts = day?.countsInTotal ?? false;
                    return (
                      <button
                        type="button"
                        key={date}
                        className={`dso-calendar-day quality-${day?.qualityStatus ?? "bad"} selection-${day?.selectionStatus ?? "neutral"} total-${day?.totalStatus ?? "ignoredInTotal"} data-${day?.dataCategoryStatus ?? "none"} ${selectedNightDate === date ? "is-focused" : ""}`}
                        onClick={() => day && setSelectedNightDate(date)}
                        onContextMenu={(event) => {
                          if (!day) return;
                          event.preventDefault();
                          setContextMenu({ date, x: event.clientX, y: event.clientY, mobile: false });
                        }}
                        disabled={!day}
                        title={`${date}: ${day ? ratingLabel(day.qualityStatus) : "ausserhalb Suchzeitraum"}`}
                      >
                        <span className="dso-calendar-topline">
                          <strong>{index + 1}</strong>
                          {day && (
                            <span
                              role="checkbox"
                              aria-checked={counts}
                              tabIndex={0}
                              className="dso-calendar-toggle"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleCalendarTotal(date, counts);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  toggleCalendarTotal(date, counts);
                                }
                              }}
                            >
                              {counts ? "zaehlt" : "Vorschau"}
                            </span>
                          )}
                        </span>
                        <span className="dso-calendar-badge">{day ? ratingLabel(day.qualityStatus) : "-"}</span>
                        <small>{day?.bestWindowStart ? `${day.bestWindowStart}-${day.bestWindowEnd ?? ""}` : "-"}</small>
                        <em>{day && day.effectiveMinutes > 0 ? formatMinutesCompact(day.effectiveMinutes) : ""}</em>
                        {day && (
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label="Mobile Kalenderoptionen"
                            className="dso-mobile-menu-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setContextMenu({ date, x: 0, y: 0, mobile: true });
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                setContextMenu({ date, x: 0, y: 0, mobile: true });
                              }
                            }}
                          >
                            ...
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
        {renderContextMenu()}
      </section>
    );
  }

  function renderFovPreview() {
    const center = primaryObject;
    const fovWidth = fieldOfView?.widthDeg ?? 2;
    const fovHeight = fieldOfView?.heightDeg ?? 1.3;
    const placedObjects = sessionObjects.map((object) => {
      const raDelta = ((((object.raDeg - center.raDeg) + 540) % 360) - 180) * Math.cos(center.decDeg * Math.PI / 180);
      const decDelta = object.decDeg - center.decDeg;
      const left = Math.max(4, Math.min(96, 50 + (raDelta / fovWidth) * 70));
      const top = Math.max(4, Math.min(96, 50 - (decDelta / fovHeight) * 70));
      const width = Math.max(3, Math.min(46, ((object.majorAxisArcMin ?? object.apparentSizeArcMin ?? 8) / 60 / fovWidth) * 82));
      const height = Math.max(3, Math.min(46, ((object.minorAxisArcMin ?? object.apparentSizeArcMin ?? 8) / 60 / fovHeight) * 82));
      const fits = Math.abs(raDelta) < fovWidth / 2 && Math.abs(decDelta) < fovHeight / 2 && width < 85 && height < 85;
      return { object, left, top, width, height, fits, raDelta, decDelta };
    });
    const allFit = placedObjects.every((entry) => entry.fits);
    const tooFar = placedObjects.some((entry) => Math.abs(entry.raDelta) > fovWidth || Math.abs(entry.decDelta) > fovHeight);
    const status = tooFar
      ? "Diese Objekte passen nicht gemeinsam ins aktuelle FOV. Plane sie als getrennte Ziele."
      : allFit
        ? "Framing passt gut fuer die aktuelle Session-Auswahl."
        : "Framing passt knapp. Pruefe Rotation und Beschnitt.";

    return (
      <section className="dso-fov-card dso-card-section" id="dso-fov">
        <div className="dso-section-heading">
          <div className="terminal-section-title">[Framing / Bildfeld]</div>
          <span className="compact-hint">Einfache FOV-Vorschau aus Katalog-RA/Dec und Objektgroesse.</span>
        </div>
        <div className="dso-fov-layout">
          <div className="dso-fov-viewport" aria-label="FOV Vorschau">
            <span className="dso-fov-axis north">N</span>
            <span className="dso-fov-axis east">O</span>
            <div className="dso-fov-frame" />
            {placedObjects.map((entry) => (
              <span
                key={entry.object.id}
                className={`dso-fov-object ${entry.fits ? "fits" : "does-not-fit"}`}
                style={{ left: `${entry.left}%`, top: `${entry.top}%`, width: `${entry.width}%`, height: `${entry.height}%` }}
                title={`${entry.object.id}: ${entry.fits ? "passt" : "ausserhalb/knapp"}`}
              >
                {entry.object.id}
              </span>
            ))}
          </div>
          <div className="dso-fov-info">
            <dl className="terminal-report">
              <dt>FOV</dt><dd>{fieldOfView ? `${formatNumber(fieldOfView.widthDeg, 2)} x ${formatNumber(fieldOfView.heightDeg, 2)} Grad` : "-"}</dd>
              <dt>Pixel Scale</dt><dd>{pixelScale ? `${formatNumber(pixelScale, 2)} arcsec/px` : "-"}</dd>
              <dt>Aktives Zentrum</dt><dd>{objectName(center)}</dd>
              <dt>Bewertung</dt><dd>{status}</dd>
            </dl>
            <div className="compact-action-row">
              <RetroButton type="button" onClick={() => markPrimaryTarget(primaryTarget?.id ?? sessionTargets[0].id)}>Auf aktives Objekt zentrieren</RetroButton>
              <RetroButton type="button" onClick={() => setFramingMessage(status)}>Alle Session-Objekte einpassen</RetroButton>
            </div>
            {framingMessage && <p className="compact-hint">{framingMessage}</p>}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dso-planner-panel dso-assistant" aria-label={text.title}>
      <div className="dso-hero">
        <div>
          <div className="terminal-section-title">[{text.title}]</div>
          <h1>Plane eine echte DSO-Session statt nur ein einzelnes Objekt.</h1>
          <p>Mehrere Ziele, Wunschbelichtung, Kalenderauswahl, FOV-Framing und nachvollziehbare Bewertung in einer Ansicht.</p>
        </div>
        <div className="dso-mode-note">
          {sessionPlan
            ? `Geplant: ${formatMinutesCompact(sessionPlan.totals.plannedEffectiveMinutes)} effektiv in ${sessionPlan.totals.selectedNightCount} Naechten.`
            : "Berechne zuerst eine Session. Danach reagieren Kalender und Parameter live."}
        </div>
      </div>

      <div className="dso-step-grid">
        <RetroFieldset legend="1. Standort & gespeicherte Standorte" className="dso-step dso-step-wide">
          <div className="dso-location-search-row">
            <label>Ort / PLZ suchen
              <RetroInput value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="z.B. Geiselhoering, Berlin, 94333" />
            </label>
            <RetroButton type="button" onClick={handleLocationSearch} disabled={isSearchingLocation}>{isSearchingLocation ? "Suche..." : "Ort suchen"}</RetroButton>
          </div>
          {locationMessage && <p className="compact-hint" aria-live="polite">{locationMessage}</p>}
          <div className="dso-form-grid">
            <label>Standortname<RetroInput value={locationName} onChange={(event) => setLocationName(event.target.value)} /></label>
            <label>Breite<RetroInput value={latitude} inputMode="decimal" onChange={(event) => setLatitude(event.target.value)} /></label>
            <label>Laenge<RetroInput value={longitude} inputMode="decimal" onChange={(event) => setLongitude(event.target.value)} /></label>
            <label>Hoehe Meter<RetroInput value={elevationMeters} inputMode="decimal" onChange={(event) => setElevationMeters(event.target.value)} /></label>
            <label>Zeitzone<RetroInput value={timeZone} onChange={(event) => setTimeZone(event.target.value)} /></label>
            <label>Bortle<RetroInput value={bortle} inputMode="decimal" onChange={(event) => setBortle(event.target.value)} /></label>
            <label>SQM<RetroInput value={sqm} inputMode="decimal" onChange={(event) => setSqm(event.target.value)} /></label>
          </div>
          <div className="dso-saved-location-row">
            <label>Gespeicherte Standorte
              <RetroSelect value={selectedLocationProfileId} onChange={(event) => setSelectedLocationProfileId(event.target.value)}>
                <option value="">Kein gespeicherter Standort</option>
                {locationProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}{profile.isDefault ? " (Standard)" : ""}</option>)}
              </RetroSelect>
            </label>
            <RetroButton type="button" onClick={loadSelectedLocation} disabled={!selectedLocationProfileId}>Gespeicherten Standort laden</RetroButton>
            <RetroButton type="button" onClick={() => saveCurrentLocation(false)}>Standort speichern</RetroButton>
            <RetroButton type="button" onClick={setSelectedLocationDefault}>Als Standard setzen</RetroButton>
            <RetroButton type="button" onClick={deleteSelectedLocation} disabled={!selectedLocationProfileId}>Standort loeschen</RetroButton>
          </div>
        </RetroFieldset>

        <RetroFieldset legend="2. Session-Ziele" className="dso-step dso-step-wide dso-object-search">
          <label>Objekt suchen<RetroInput value={objectQuery} onChange={(event) => setObjectQuery(event.target.value)} placeholder="M31, M51, Andromeda" /></label>
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
                <span>{object.germanName ?? object.primaryName}</span>
                <small>{objectTypeLabel(object.objectType)} | mag {object.visualMagnitude ?? "-"} | {objectDifficultyLabel(object)}</small>
              </button>
            ))}
          </div>
          <div className="compact-action-row">
            <RetroButton type="button" onClick={() => addSessionTarget(selectedObject)}>Zur Session hinzufuegen</RetroButton>
            <RetroButton type="button" onClick={handleFavorite}>{favorites.includes(objectId) ? "Favorit entfernen" : "Favorit"}</RetroButton>
            <span className="compact-hint">Messier-Objekte: {messierCatalog.length}</span>
          </div>
          <div className="dso-target-list">
            {sessionTargets.map((target) => {
              const object = messierCatalog.find((entry) => entry.id === target.objectId);
              if (!object) return null;
              return (
                <article key={target.id} className={`dso-target-card ${target.isPrimary ? "is-primary" : ""}`}>
                  <div>
                    <strong>{objectName(object)}</strong>
                    <span>{objectTypeLabel(object.objectType)} | mag {object.visualMagnitude ?? "-"} | Groesse {object.majorAxisArcMin ?? object.apparentSizeArcMin ?? "-"}'</span>
                  </div>
                  <label>effektive Zielzeit
                    <RetroInput value={String(target.targetEffectiveHours)} inputMode="decimal" onChange={(event) => updateTarget(target.id, { targetEffectiveHours: Math.max(0, Number.parseFloat(event.target.value) || 0) })} />
                  </label>
                  <label>Prioritaet
                    <RetroInput value={String(target.priority)} inputMode="numeric" onChange={(event) => updateTarget(target.id, { priority: Math.max(1, Number.parseInt(event.target.value, 10) || 1) })} />
                  </label>
                  <label className="dso-checkbox"><input type="checkbox" checked={target.enabled} onChange={(event) => updateTarget(target.id, { enabled: event.target.checked })} /> aktiv</label>
                  <RetroButton type="button" onClick={() => markPrimaryTarget(target.id)}>als Hauptziel</RetroButton>
                  <RetroButton type="button" onClick={() => removeTarget(target.id)} disabled={sessionTargets.length <= 1}>entfernen</RetroButton>
                </article>
              );
            })}
          </div>
        </RetroFieldset>

        <RetroFieldset legend="3. Setup, Qualitaet & FOV" className="dso-step dso-step-wide">
          <div className="dso-form-grid">
            <label>Setup-Profil
              <RetroSelect value={setupProfileId} onChange={(event) => setSetupProfileId(event.target.value)}>
                {setupProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </RetroSelect>
            </label>
            <label>Qualitaetsprofil
              <RetroSelect value={qualityId} onChange={(event) => setQualityId(event.target.value as QualityProfileId)}>
                {qualityProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </RetroSelect>
            </label>
          </div>
          <article className="dso-quality-explainer">
            <strong>{qualityInfo.title}</strong>
            <p>{qualityInfo.body}</p>
            <details>
              <summary>Was beeinflusst das Qualitaetsprofil?</summary>
              <ul>{qualityInfo.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
            </details>
          </article>
          <dl className="terminal-report">
            <dt>FOV</dt><dd>{fieldOfView ? `${formatNumber(fieldOfView.widthDeg, 2)} x ${formatNumber(fieldOfView.heightDeg, 2)} Grad` : "-"}</dd>
            <dt>Pixel Scale</dt><dd>{pixelScale ? `${formatNumber(pixelScale, 2)} arcsec/px` : "-"}</dd>
            <dt>Filter</dt><dd>{setupProfile.filterMode}</dd>
          </dl>
        </RetroFieldset>

        <RetroFieldset legend="4. Planung / Wunschzeit" className="dso-step dso-step-wide">
          <div className="dso-mode-choice">
            <label><input type="radio" checked={mode === "range"} onChange={() => setMode("range")} /> <span>Zeitraum analysieren</span></label>
            <label><input type="radio" checked={mode === "targetHours"} onChange={() => setMode("targetHours")} /> <span>Wunschbelichtungszeit erreichen</span></label>
          </div>
          <div className="dso-form-grid">
            <label>Startdatum<RetroInput type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label>Enddatum<RetroInput type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
            <label>Rechenintervall
              <RetroSelect value={String(intervalMinutes)} onChange={(event) => setIntervalMinutes(Number(event.target.value))}>
                {[5, 10, 15, 30, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
              </RetroSelect>
            </label>
            <label>Gesamtziel effektiv<RetroInput value={targetEffectiveHours} inputMode="decimal" onChange={(event) => setTargetEffectiveHours(event.target.value)} /></label>
            <label>Belichtungsziel verteilen
              <RetroSelect value={allocationMode} onChange={(event) => setAllocationMode(event.target.value as SessionAllocationMode)}>
                <option value="equal">Gleichmaessig</option>
                <option value="manual">Manuell pro Objekt</option>
                <option value="priority">Nach Prioritaet</option>
              </RetroSelect>
            </label>
            <label className="dso-checkbox"><input type="checkbox" checked={weekendOnly} onChange={(event) => setWeekendOnly(event.target.checked)} /> Nur Wochenenden</label>
            <label className="dso-checkbox"><input type="checkbox" checked={autoRecalculate} onChange={(event) => setAutoRecalculate(event.target.checked)} /> Automatisch neu berechnen</label>
          </div>
          <details className="dso-compact-details">
            <summary>Optionale Ausnahmen</summary>
            <div className="dso-form-grid two-columns">
              <label>Zusaetzliche Naechte einbeziehen<textarea value={forceDates} onChange={(event) => setForceDates(event.target.value)} placeholder="YYYY-MM-DD, getrennt mit Komma oder Zeilenumbruch" /></label>
              <label>Naechte ausschliessen<textarea value={excludeDates} onChange={(event) => setExcludeDates(event.target.value)} placeholder="YYYY-MM-DD, getrennt mit Komma oder Zeilenumbruch" /></label>
            </div>
          </details>
        </RetroFieldset>
      </div>

      <div className="analyze-row dso-analyze-row">
        {isRecalculating && <span className="compact-hint" aria-live="polite">Berechne neu...</span>}
        <RetroButton type="button" variant="primary" onClick={() => calculate(false)}>{text.calculate}</RetroButton>
      </div>

      {messages.length > 0 && (
        <section className="dso-warning-box compact-messages" aria-live="polite">
          <div>
            <strong>Wichtige Hinweise zur aktuellen Berechnung</strong>
            <p>Diese Hinweise erklaeren, warum viele Fenster nicht als Hauptdaten bewertet wurden.</p>
          </div>
          {messages.map((message, index) => (
            <details key={`${message}-${index}`} open>
              <summary>{message}</summary>
              <p>Die Bewertung nutzt Sonne, Mond, Zielhoehe, Objektprofil, Setup und lokale Bedingungen. Rohdaten findest du unten im Bereich Rechenweg.</p>
            </details>
          ))}
        </section>
      )}

      <section className="dso-results dso-card-section" id="dso-results">
        <div className="terminal-section-title">[Ergebnis / Belichtungsziel]</div>
        {!sessionPlan ? <p className="empty-state">{text.noPlan}</p> : (
          <>
            <section className="dso-result-summary">
              <div>
                <h2>{sessionPlan.totals.reached ? "Belichtungsziel erreicht." : "Belichtungsziel noch nicht erreicht."}</h2>
                <p>
                  Effektive Zeit ist gewichtete Nutzzeit nach Bedingungen. Echte Aufnahmezeit ist reale Zeit am Himmel.
                  Leicht ueber Ziel ist normal, weil ganze Aufnahmefenster ausgewaehlt werden.
                </p>
              </div>
              <div className="dso-summary-grid dso-summary-grid-readable">
                <article><span>Wunsch effektiv</span><strong>{formatMinutesCompact(sessionPlan.totals.targetEffectiveMinutes)}</strong></article>
                <article><span>Geplant effektiv</span><strong>{formatMinutesCompact(sessionPlan.totals.plannedEffectiveMinutes)}</strong></article>
                <article><span>Echte Aufnahmezeit</span><strong>{formatMinutesCompact(sessionPlan.totals.realDurationMinutes)}</strong></article>
                <article><span>Fenster / Naechte</span><strong>{sessionPlan.totals.selectedWindowCount} / {sessionPlan.totals.selectedNightCount}</strong></article>
              </div>
            </section>

            <section className="dso-target-progress dso-card-section">
              <div className="terminal-section-title">[Belichtungsziel pro Objekt]</div>
              <div className="dso-target-progress-grid">
                {sessionPlan.objectPlans.map((entry) => (
                  <article key={entry.target.id} className="dso-object-progress-card">
                    <div className="dso-progress-heading">
                      <strong>{objectName(entry.object)}</strong>
                      <span>{entry.reached ? "erreicht" : "offen"}</span>
                    </div>
                    <div className="dso-progress-bar"><span style={{ width: `${Math.min(100, entry.effectiveDurationMinutes / Math.max(1, entry.targetEffectiveMinutes) * 100)}%` }} /></div>
                    <dl className="terminal-report">
                      <dt>Wunsch</dt><dd>{formatMinutesCompact(entry.targetEffectiveMinutes)} effektiv</dd>
                      <dt>Geplant</dt><dd>{formatMinutesCompact(entry.effectiveDurationMinutes)} effektiv</dd>
                      <dt>Echt</dt><dd>{formatMinutesCompact(entry.realDurationMinutes)}</dd>
                      <dt>Fenster</dt><dd>{entry.selectedWindows.length}</dd>
                    </dl>
                  </article>
                ))}
              </div>
            </section>

            {renderCalendar()}

            {focusedNight && (
              <section className="dso-night-focus dso-card-section" id="dso-night-focus">
                <div className="terminal-section-title">[Ausgewaehlte Nacht]</div>
                <h3>{focusedNight.nightLabel} - {ratingLabel(focusedNight.overallNightRating)}</h3>
                <dl className="terminal-report">
                  <dt>Beste Zeit</dt><dd>{focusedNight.bestWindowStart ?? "-"}-{focusedNight.bestWindowEnd ?? "-"}</dd>
                  <dt>Astronomische Nacht</dt><dd>{focusedNight.astronomicalNightStart ?? "-"}-{focusedNight.astronomicalNightEnd ?? "-"}</dd>
                  <dt>Kulmination</dt><dd>{focusedNight.targetCulminationTime ?? "-"}</dd>
                  <dt>Max. Hoehe</dt><dd>{formatNumber(focusedNight.targetMaxAltitudeDeg)} Grad</dd>
                  <dt>MAIN</dt><dd>{formatMinutesCompact(focusedNight.mainDuration)}</dd>
                  <dt>EXTRA</dt><dd>{formatMinutesCompact(focusedNight.extraDuration)}</dd>
                </dl>
                <p className="compact-hint">{humanizeReasonList(focusedNight.mainWarnings, 4)}</p>
                <div className="dso-window-track">
                  {focusedNight.windows.map((window) => (
                    <span
                      key={`${window.startUtc}-${window.category}`}
                      className={`dso-window dso-window-${window.category.toLowerCase()} ${selectedWindowKeys.has(windowKey(window)) ? "is-selected-target" : ""}`}
                      style={{ flexGrow: Math.max(1, window.durationMinutes) }}
                      title={`${window.startLocal}-${window.endLocal} ${window.category}, Score ${formatNumber(window.averageScore, 0)}`}
                    >
                      {selectedWindowKeys.has(windowKey(window)) ? "ZIEL" : window.category}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {renderFovPreview()}

            <section className="dso-category-help dso-card-section">
              <strong>Kategorien:</strong>
              <span><b>MAIN</b> = beste Hauptdaten</span>
              <span><b>EXTRA</b> = brauchbare Zusatzdaten</span>
              <span><b>TEST</b> = Testdaten / helle Ziele</span>
              <span><b>BAD</b> = nicht aufnehmen</span>
            </section>

            <section className="dso-table-panel dso-card-section">
              <div className="dso-section-heading">
                <div className="terminal-section-title">[Ausgewaehlte Aufnahmefenster]</div>
                <div className="dso-export-row">
                  <span>Export</span>
                  <RetroButton type="button" onClick={exportSessionMarkdownFile}>Session MD</RetroButton>
                  <RetroButton type="button" onClick={exportSessionTextFile}>Session TXT</RetroButton>
                  <RetroButton type="button" onClick={exportXlsxFile}>Aktives Objekt XLSX</RetroButton>
                  <RetroButton type="button" onClick={exportTxt}>Aktives Objekt TXT</RetroButton>
                  <RetroButton type="button" onClick={exportMarkdownFile}>Aktives Objekt MD</RetroButton>
                </div>
              </div>
              <div className="retro-data-grid dso-readable-table">
                <table>
                  <thead><tr><th>Objekt</th><th>Nacht</th><th>Start</th><th>Ende</th><th>Kategorie</th><th>Echt</th><th>Effektiv</th><th>Score</th><th>Status</th><th>Hauptgrund</th></tr></thead>
                  <tbody>{windowsForDisplay.map((window) => (
                    <tr key={`${window.targetId}-${window.nightLabel}-${window.startUtc}`} className={window.includeInTotals ? "is-focused-row" : undefined}>
                      <td>{window.objectId}</td>
                      <td>{window.nightLabel}</td>
                      <td>{window.startLocal}</td>
                      <td>{window.endLocal}</td>
                      <td>{humanCategory(window.category)}</td>
                      <td>{formatMinutesCompact(window.durationMinutes)}</td>
                      <td>{formatMinutesCompact(window.effectiveDurationMinutes)}</td>
                      <td>{formatNumber(window.averageScore, 0)}</td>
                      <td>{"includeInTotals" in window ? (window.includeInTotals ? "zaehlt" : "Vorschau") : "-"}</td>
                      <td>{primaryWindowReason(window)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              {windowsForDisplay.slice(0, 8).map((window) => (
                <article key={`why-${window.objectId}-${window.nightLabel}-${window.startUtc}`} className="dso-window-card">
                  <div>
                    <strong>{window.objectId} {window.nightLabel} {window.startLocal}-{window.endLocal}</strong>
                    <span>{humanCategory(window.category)} | {formatMinutesCompact(window.durationMinutes)} echt - {formatMinutesCompact(window.effectiveDurationMinutes)} effektiv</span>
                  </div>
                  {renderWhyWindow(window)}
                </article>
              ))}
            </section>

            <section className="dso-table-panel dso-card-section">
              <div className="dso-section-heading">
                <div className="terminal-section-title">[Rechenweg / Rohdaten]</div>
                <RetroButton type="button" onClick={() => setShowIntervals((shown) => !shown)}>{showIntervals ? "Rohdaten ausblenden" : "Rohdaten anzeigen"}</RetroButton>
              </div>
              <p className="compact-hint">Rohdaten sind standardmaessig geschlossen. Fuer normale Planung reichen Kalender, Belichtungsziel und Aufnahmefenster.</p>
              {showIntervals && plan && (
                <div className="retro-data-grid">
                  <table>
                    <thead><tr><th>Nacht</th><th>Lokal</th><th>Score</th><th>Kat</th><th>Sonne</th><th>Mond</th><th>Monddistanz</th><th>Zielhoehe</th><th>Airmass</th><th>Gruende</th></tr></thead>
                    <tbody>{plan.nights.flatMap((night) => night.intervals).slice(0, 800).map((interval) => (
                      <tr key={`${interval.nightLabel}-${interval.utcDateTime}`}>
                        <td>{interval.nightLabel}</td>
                        <td>{interval.localDateTime.slice(11)}</td>
                        <td>{interval.finalDsoScore}</td>
                        <td>{interval.category}</td>
                        <td>{formatNumber(interval.sunAltitudeDeg)} Grad</td>
                        <td>{formatNumber(interval.moonIlluminationPercent, 0)}%, {formatNumber(interval.moonAltitudeDeg)} Grad</td>
                        <td>{formatNumber(interval.angularSeparationMoonTargetDeg, 0)} Grad</td>
                        <td>{formatNumber(interval.targetAltitudeDeg)} Grad</td>
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
