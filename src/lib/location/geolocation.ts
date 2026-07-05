import type { BrowserLocationResult } from "../../types";

export type GeolocationFailure = "geolocationUnsupported" | "geolocationDenied";

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
      () => reject(new Error("geolocationDenied" satisfies GeolocationFailure)),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

