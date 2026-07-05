import type { CalculationWarning, EventKind, EventResult, ExportMetadata, RefractionMode, ResultRow, TargetBody } from "../../types";
import type { TranslationKey, Translator } from "../../i18n";

export interface ResultColumn {
  key: keyof ResultRow;
  labelKey: TranslationKey;
}

export const resultColumns: ResultColumn[] = [
  { key: "index", labelKey: "columnIndex" },
  { key: "body", labelKey: "columnBody" },
  { key: "localDate", labelKey: "columnLocalDate" },
  { key: "localTime", labelKey: "columnLocalTime" },
  { key: "timeZone", labelKey: "columnTimeZone" },
  { key: "utcTime", labelKey: "columnUtcTime" },
  { key: "azimuthDeg", labelKey: "columnAzimuthDeg" },
  { key: "apparentAltitudeDeg", labelKey: "columnApparentAltitudeDeg" },
  { key: "geometricAltitudeDeg", labelKey: "columnGeometricAltitudeDeg" },
  { key: "apparentZenithDeg", labelKey: "columnApparentZenithDeg" },
  { key: "geometricZenithDeg", labelKey: "columnGeometricZenithDeg" },
  { key: "rightAscension", labelKey: "columnRightAscension" },
  { key: "declinationDeg", labelKey: "columnDeclinationDeg" },
  { key: "distanceKm", labelKey: "columnDistanceKm" },
  { key: "phaseName", labelKey: "columnPhaseName" },
  { key: "illuminationPercent", labelKey: "columnIlluminationPercent" },
  { key: "warnings", labelKey: "columnWarnings" }
];

export function formatTargetBody(target: TargetBody, t: Translator): string {
  return target === "both" ? t("both") : t(target);
}

export function formatRefractionMode(mode: RefractionMode, t: Translator): string {
  if (mode === "none") return t("refractionNone");
  if (mode === "custom") return t("refractionCustom");
  return t("refractionStandard");
}

export function formatWarning(warning: CalculationWarning, t: Translator): string {
  const key = `warning_${warning}` as TranslationKey;
  return t(key);
}

export function formatEventKind(kind: EventKind, t: Translator): string {
  if (kind === "rise") return t("eventRise");
  if (kind === "set") return t("eventSet");
  return t("eventTransit");
}

export function formatCellValue(value: ResultRow[keyof ResultRow], t: Translator, precision = 6): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((warning) => formatWarning(warning, t)).join("; ");
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toFixed(precision) : "";
  }

  if (value === "sun" || value === "moon") {
    return t(value);
  }

  if (
    value === "newMoon" ||
    value === "waxingCrescent" ||
    value === "firstQuarter" ||
    value === "waxingGibbous" ||
    value === "fullMoon" ||
    value === "waningGibbous" ||
    value === "thirdQuarter" ||
    value === "waningCrescent"
  ) {
    return t(value);
  }

  return String(value);
}

export function metadataRows(metadata: ExportMetadata, t: Translator): Array<[string, string]> {
  return [
    [t("metadataAppVersion"), metadata.appVersion],
    [t("metadataCreatedAtUtc"), metadata.createdAtUtc],
    [t("metadataLocation"), metadata.locationName],
    [t("metadataLatitude"), metadata.latitude.toFixed(6)],
    [t("metadataLongitude"), metadata.longitude.toFixed(6)],
    [t("metadataElevation"), metadata.elevationMeters.toFixed(2)],
    [t("metadataTimeZone"), metadata.timeZone],
    [t("metadataTargetBodies"), formatTargetBody(metadata.targetBodies, t)],
    [t("metadataRange"), `${metadata.startLocal} - ${metadata.endLocal}`],
    [t("metadataInterval"), metadata.intervalMinutes === null ? t("singleInstant") : `${metadata.intervalMinutes} ${t("minutes")}`],
    [t("metadataAlgorithm"), metadata.algorithm],
    [t("metadataRefraction"), `${formatRefractionMode(metadata.refraction.mode, t)} (${metadata.refraction.pressureHpa} hPa, ${metadata.refraction.temperatureC} C)`],
    [t("metadataAccuracyNote"), metadata.accuracyNote]
  ];
}

export function eventRows(events: EventResult[], t: Translator): string[][] {
  return events.map((event) => [
    t(event.body),
    formatEventKind(event.kind, t),
    event.status === "found" ? t("eventFound") : t("eventNotFound"),
    event.localDate ?? "",
    event.localTime ?? "",
    event.utcTime ?? "",
    event.azimuthDeg === null ? "" : event.azimuthDeg.toFixed(6),
    event.apparentAltitudeDeg === null ? "" : event.apparentAltitudeDeg.toFixed(6),
    event.geometricAltitudeDeg === null ? "" : event.geometricAltitudeDeg.toFixed(6),
    event.warning ? formatWarning(event.warning, t) : ""
  ]);
}
