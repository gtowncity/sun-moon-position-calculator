import type { ObserverLocation, RefractionSettings } from "../../domain/types";
import { calculateBodyPosition } from "../common/position";

export function calculateLunarPosition(date: Date, observer: ObserverLocation, refraction: RefractionSettings) {
  return calculateBodyPosition("moon", date, observer, refraction);
}
