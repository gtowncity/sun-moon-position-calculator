import type { ResultRow } from "../../types";
import { sortResultRows } from "../results/sort";

export type SolarPhaseName = "day" | "civilTwilight" | "nauticalTwilight" | "astronomicalTwilight" | "night";

export interface SolarPhaseSummary {
  localDate: string;
  phases: Record<SolarPhaseName, string | null>;
}

const phaseOrder: SolarPhaseName[] = [
  "day",
  "civilTwilight",
  "nauticalTwilight",
  "astronomicalTwilight",
  "night"
];

export function classifySolarAltitude(altitudeDeg: number): SolarPhaseName {
  if (altitudeDeg > 0) return "day";
  if (altitudeDeg >= -6) return "civilTwilight";
  if (altitudeDeg >= -12) return "nauticalTwilight";
  if (altitudeDeg >= -18) return "astronomicalTwilight";
  return "night";
}

function shortTime(localTime: string): string {
  return localTime.slice(0, 5);
}

function createEmptyPhases(): Record<SolarPhaseName, string | null> {
  return {
    day: null,
    civilTwilight: null,
    nauticalTwilight: null,
    astronomicalTwilight: null,
    night: null
  };
}

export function summarizeSolarPhases(rows: ResultRow[]): SolarPhaseSummary[] {
  const sunRows = sortResultRows(rows).filter((row) => row.body === "sun");
  const grouped = new Map<string, ResultRow[]>();

  for (const row of sunRows) {
    grouped.set(row.localDate, [...(grouped.get(row.localDate) ?? []), row]);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([localDate, dateRows]) => {
      const phases = createEmptyPhases();
      let activePhase: SolarPhaseName | null = null;
      let startTime: string | null = null;
      let endTime: string | null = null;

      function commit() {
        if (!activePhase || !startTime || !endTime) return;
        const label = startTime === endTime ? startTime : `${startTime}-${endTime}`;
        phases[activePhase] = phases[activePhase] ? `${phases[activePhase]}, ${label}` : label;
      }

      for (const row of dateRows) {
        const phase = classifySolarAltitude(row.altitudeDeg);
        const time = shortTime(row.localTime);

        if (phase !== activePhase) {
          commit();
          activePhase = phase;
          startTime = time;
        }

        endTime = time;
      }

      commit();

      for (const phase of phaseOrder) {
        phases[phase] ??= null;
      }

      return { localDate, phases };
    });
}

