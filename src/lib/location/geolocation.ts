import type { BrowserLocationResult } from "../../types";

export type GeolocationFailure =
  | "geolocationUnsupported"
  | "geolocationDenied"
  | "geolocationUnavailable"
  | "geolocationTimeout"
  | "geolocationUnknown";

function geolocationFailure(error: GeolocationPositionError): GeolocationFailure {
  if (error.code === 1) return "geolocationDenied";
  if (error.code === 2) return "geolocationUnavailable";
  if (error.code === 3) return "geolocationTimeout";
  return "geolocationUnknown";
}

export function getBrowserLocation(
  geolocation: Geolocation | undefined = navigator.geolocation
): Promise<BrowserLocationResult> {
  if (!geolocation) {
    return Promise.reject(new Error("geolocationUnsupported" satisfies GeolocationFailure));
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          elevationMeters: position.coords.altitude ?? 0,
          accuracyMeters: position.coords.accuracy
        });
      },
      (error) => reject(new Error(geolocationFailure(error))),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

