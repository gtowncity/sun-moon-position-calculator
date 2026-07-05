import type { ObserverLocation } from "../../types";
import { parseDecimalNumber } from "../numberParsing";

export interface CoordinateValidationResult {
  location?: ObserverLocation;
  errors: Array<"invalidLatitude" | "invalidLongitude" | "invalidElevation">;
}

export function validateCoordinates(
  latitudeValue: string,
  longitudeValue: string,
  elevationValue: string
): CoordinateValidationResult {
  const latitude = parseDecimalNumber(latitudeValue, { required: true });
  const longitude = parseDecimalNumber(longitudeValue, { required: true });
  const elevationMeters = parseDecimalNumber(elevationValue, { required: false });
  const errors: CoordinateValidationResult["errors"] = [];

  if (latitude === null || latitude < -90 || latitude > 90) {
    errors.push("invalidLatitude");
  }

  if (longitude === null || longitude < -180 || longitude > 180) {
    errors.push("invalidLongitude");
  }

  if (elevationMeters === null) {
    errors.push("invalidElevation");
  }

  if (errors.length > 0) {
    return { errors };
  }

  const validLatitude = latitude;
  const validLongitude = longitude;
  const validElevationMeters = elevationMeters;

  if (validLatitude === null || validLongitude === null || validElevationMeters === null) {
    return { errors: ["invalidLatitude"] };
  }

  return {
    location: {
      latitude: validLatitude,
      longitude: validLongitude,
      elevationMeters: validElevationMeters
    },
    errors
  };
}
