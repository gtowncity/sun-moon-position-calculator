# PRIVACY.md

## Browser Geolocation

Browser geolocation is requested only after the user clicks the automatic-detection button. The browser permission prompt controls access. If permission is denied, the app reports the denial and still fills date, time and time zone where possible.

The app does not repeatedly spam permission prompts and does not use workarounds to bypass browser controls.

## Place and Postal-Code Search

Place and postal-code search sends the search term to Open-Meteo Geocoding. Search results are shown as a list; the app does not silently select the first result.

## Local Storage

The app stores only necessary UI preferences such as language. Exact locations are not stored unless the user explicitly saves a location. Saved locations remain in this browser's `localStorage` and can be deleted in the UI.

## No Tracking

The app has:

- no analytics;
- no tracking cookies;
- no backend database;
- no API keys;
- no secret tokens in the repository.

## Exports

Export files contain the metadata needed to reproduce a calculation, including location, elevation, time zone, time range, interval, algorithm and refraction settings. Users should treat exports as location data if they contain precise coordinates.
