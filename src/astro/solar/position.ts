import type { ObserverLocation, RefractionSettings } from "../../domain/types";
import { calculateBodyPosition } from "../common/position";

export function calculateSolarPosition(date: Date, observer: ObserverLocation, refraction: RefractionSettings) {
  return calculateBodyPosition("sun", date, observer, refraction);
}
