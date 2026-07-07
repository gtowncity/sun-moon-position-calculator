export type CalculationTarget = "sun" | "moon" | "both";
export type ObserverSource = "manual" | "browser" | "geocoding" | "postal";
export type RefractionMode = "off" | "standard" | "custom";
export type AngleFormat = "decimal" | "dms";
export type Language = "de" | "en";

export interface CalculationRequest {
  targets: CalculationTarget;
  observer: {
    latitudeDeg: number;
    longitudeDeg: number;
    elevationMeters?: number;
    source: ObserverSource;
  };
  time: {
    timezoneIana: string;
    startLocal: string;
    mode: "one-night" | "single" | "range" | "duration";
    intervalMinutes: number;
  };
  options: {
    language: Language;
    refractionMode: RefractionMode;
    angleFormat: AngleFormat;
    outputPrecision: number;
  };
}

export interface CalculationFormState {
  latitudeDeg: string;
  longitudeDeg: string;
  elevationMeters: string;
  observerSource: ObserverSource;
  date: string;
  time: string;
  timezoneIana: string;
  target: CalculationTarget;
  mode: "one-night" | "single" | "range" | "duration";
  intervalMinutes: string;
  language: Language;
  refractionMode: RefractionMode;
  angleFormat: AngleFormat;
  outputPrecision: string;
}

export const defaultCalculationFormState: CalculationFormState = {
  latitudeDeg: "52.520000",
  longitudeDeg: "13.405000",
  elevationMeters: "34",
  observerSource: "manual",
  date: "2026-07-07",
  time: "16:00",
  timezoneIana: "Europe/Berlin",
  target: "both",
  mode: "one-night",
  intervalMinutes: "10",
  language: "de",
  refractionMode: "standard",
  angleFormat: "decimal",
  outputPrecision: "2"
};

const toNumber = (value: string, fallback = 0) => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export function buildCalculationRequest(form: CalculationFormState): CalculationRequest {
  return {
    targets: form.target,
    observer: {
      latitudeDeg: toNumber(form.latitudeDeg),
      longitudeDeg: toNumber(form.longitudeDeg),
      elevationMeters: toNumber(form.elevationMeters),
      source: form.observerSource
    },
    time: {
      timezoneIana: form.timezoneIana,
      startLocal: `${form.date}T${form.time}`,
      mode: form.mode,
      intervalMinutes: Math.max(1, toNumber(form.intervalMinutes, 10))
    },
    options: {
      language: form.language,
      refractionMode: form.refractionMode,
      angleFormat: form.angleFormat,
      outputPrecision: Math.max(0, toNumber(form.outputPrecision, 2))
    }
  };
}
