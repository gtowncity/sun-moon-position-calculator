import type { EventResult, ExportMetadata, ResultRow } from "../src/types";

export function makeRow(body: "sun" | "moon", utcTime: string, index = 1): ResultRow {
  return {
    index,
    localDate: "2026-07-03",
    localTime: utcTime.includes("12:00") ? "14:00:00" : "14:15:00",
    timeZone: "Europe/Berlin",
    utcTime,
    latitude: 52.52,
    longitude: 13.405,
    elevationMeters: 34.5,
    body,
    azimuthDeg: body === "sun" ? 123.456789 : 223.456789,
    apparentAltitudeDeg: 12.456789,
    geometricAltitudeDeg: 12.345678,
    apparentZenithDeg: 77.543211,
    geometricZenithDeg: 77.654322,
    altitudeDeg: 12.345678,
    zenithDeg: 77.654322,
    rightAscension: 4.25,
    declinationDeg: 20.5,
    distanceKm: body === "sun" ? 152000000 : 384400,
    phaseName: body === "moon" ? "fullMoon" : null,
    illuminationPercent: body === "moon" ? 99.9 : null,
    warnings: body === "sun" ? [] : ["nearHorizon"],
    algorithm: "astronomy-engine topocentric equator/horizon"
  };
}

export function makeEvents(): EventResult[] {
  return [
    {
      body: "sun",
      kind: "rise",
      status: "found",
      localDate: "2026-07-03",
      localTime: "04:48:00",
      timeZone: "Europe/Berlin",
      utcTime: "2026-07-03T02:48:00Z",
      azimuthDeg: 52,
      apparentAltitudeDeg: -0.1,
      geometricAltitudeDeg: -0.7,
      warning: "nearHorizon"
    },
    {
      body: "moon",
      kind: "set",
      status: "not_found",
      localDate: null,
      localTime: null,
      timeZone: "Europe/Berlin",
      utcTime: null,
      azimuthDeg: null,
      apparentAltitudeDeg: null,
      geometricAltitudeDeg: null,
      warning: "noSet"
    }
  ];
}

export function makeMetadata(): ExportMetadata {
  return {
    appVersion: "0.2.0",
    createdAtUtc: "2026-07-03T12:00:00.000Z",
    locationName: "Berlin",
    latitude: 52.52,
    longitude: 13.405,
    elevationMeters: 34.5,
    timeZone: "Europe/Berlin",
    targetBodies: "both",
    startLocal: "2026-07-03 14:00 Europe/Berlin",
    endLocal: "2026-07-03 14:15 Europe/Berlin",
    intervalMinutes: 15,
    rangeMode: "end",
    algorithm: "astronomy-engine topocentric equator/horizon",
    refraction: { mode: "standard", pressureHpa: 1013.25, temperatureC: 15 },
    accuracyNote: "Runtime results require external validation fixtures.",
    language: "en"
  };
}
