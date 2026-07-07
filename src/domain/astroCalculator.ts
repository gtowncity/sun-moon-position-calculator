import { Body, Equator, Horizon, Illumination, Observer } from "astronomy-engine";
import type { CalculationFormState } from "./calculationRequest";

const KM_PER_AU = 149_597_870.7;

export interface AstroPosition {
  object: "Sonne" | "Mond";
  timeLabel: string;
  azimuthDeg: number;
  altitudeDegApparent: number;
  altitudeDegGeometric: number;
  zenithDegApparent: number;
  distanceKm?: number;
  illuminationPercent?: number;
}

export interface AstroSnapshot {
  startDate: Date;
  endDate: Date;
  sun: AstroPosition;
  moon: AstroPosition;
  previewRows: AstroPosition[];
}

const toNumber = (value: string, fallback = 0) => {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const localDate = (date: string, time: string) => new Date(`${date}T${time}:00`);

export const formatDeg = (value: number) => `${value.toFixed(2)}°`;
export const formatPercent = (value: number) => `${Math.round(value)} %`;
export const formatKm = (value: number) => `${Math.round(value).toLocaleString("de-DE")} km`;
export const formatTime = (date: Date) => date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
export const formatDate = (dateText: string) => {
  const [year, month, day] = dateText.split("-");
  return year && month && day ? `${day}.${month}.${year}` : dateText;
};

function calculateBody(body: Body, object: "Sonne" | "Mond", date: Date, observer: Observer): AstroPosition {
  const equ = Equator(body, date, observer, true, true);
  const apparent = Horizon(date, observer, equ.ra, equ.dec, "normal");
  const geometric = Horizon(date, observer, equ.ra, equ.dec, undefined);
  const illum = object === "Mond" ? Illumination(Body.Moon, date) : null;

  return {
    object,
    timeLabel: formatTime(date),
    azimuthDeg: apparent.azimuth,
    altitudeDegApparent: apparent.altitude,
    altitudeDegGeometric: geometric.altitude,
    zenithDegApparent: 90 - apparent.altitude,
    distanceKm: object === "Mond" ? equ.dist * KM_PER_AU : undefined,
    illuminationPercent: illum ? illum.phase_fraction * 100 : undefined
  };
}

export function buildAstroSnapshot(form: CalculationFormState): AstroSnapshot {
  const observer = new Observer(
    toNumber(form.latitudeDeg),
    toNumber(form.longitudeDeg),
    toNumber(form.elevationMeters)
  );
  const startDate = localDate(form.date, form.time);
  const endDate = localDate(form.endDate, form.endTime);
  const stepMinutes = Math.max(1, toNumber(form.intervalMinutes, 10));

  const previewRows: AstroPosition[] = [];
  const maxRows = 5;
  let current = new Date(startDate);
  while (previewRows.length < maxRows && current <= endDate) {
    if (form.target === "both" || form.target === "sun") {
      previewRows.push(calculateBody(Body.Sun, "Sonne", current, observer));
    }
    if (previewRows.length >= maxRows) break;
    if (form.target === "both" || form.target === "moon") {
      previewRows.push(calculateBody(Body.Moon, "Mond", current, observer));
    }
    current = new Date(current.getTime() + stepMinutes * 60_000);
  }

  return {
    startDate,
    endDate,
    sun: calculateBody(Body.Sun, "Sonne", startDate, observer),
    moon: calculateBody(Body.Moon, "Mond", startDate, observer),
    previewRows
  };
}
