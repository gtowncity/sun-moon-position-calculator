# solar-lunar-position-tool

A local Vite + React + TypeScript web tool for calculating topocentric Sun and Moon positions for an observer location, IANA time zone and selectable time range.

## Features

- Sun, Moon or both bodies in one calculation
- Manual latitude, longitude and optional elevation
- Browser geolocation only after an explicit user click
- Place and postal-code search through Open-Meteo Geocoding
- IANA time-zone dropdown and browser time-zone suggestion
- Local date/time handling with `@js-temporal/polyfill`
- Single instant, start/end and start/duration calculation modes
- Astro-night mode: select an evening date and analyze the night into the following morning
- Effective imaging-window calculation from solar altitude thresholds (-18, -15 and -12 degrees)
- Large interactive night timeline, altitude curve, sky compass and multi-night planner
- UTC-based interval generation with row limits
- Refraction modes: none, standard and custom pressure/temperature
- Result table with local time, UTC time, true-north azimuth, geometric/apparent altitude and zenith angle
- Sun/Moon rise, set and transit event cards
- CSV, XLSX, TXT and Markdown export with metadata
- German and English UI through JSON i18n files
- Optional local saved locations in browser `localStorage`

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Tests

```bash
npm test
```

If Playwright browsers are installed, run:

```bash
npm run test:e2e
```

## Build

```bash
npm run build
```

## Usage

1. Select the analysis mode. "One night" automatically analyzes the selected evening date into the following morning.
2. Enter coordinates manually, use browser geolocation, or search for a place/postal code.
3. Select the night date and IANA time zone.
4. Choose the imaging mode: strict DSO (-18 deg), balanced DSO (-15 deg), or bright targets/test (-12 deg).
5. Explore the hero result, night timeline, altitude curve, sky compass and multi-night planner.
6. Calculate/export the detailed table as needed.

Example: selecting `2026-07-05` in one-night mode displays the night from `05.07.2026` to `06.07.2026` and calculates effective imaging time from the Sun's altitude.

## Accuracy Notice

Runtime calculations currently use `astronomy-engine` for Sun and Moon positions. Moon calculations are topocentric and include observer-location parallax. NREL SPA is documented as the target reference procedure for solar validation, but the project does not copy NREL source code and does not claim NREL-SPA-level accuracy until a cleanly licensed SPA implementation and real reference fixtures are added.

See `ACCURACY.md`, `ALGORITHMS.md` and `VALIDATION.md` for details.

## Privacy Notice

The app has no backend, no analytics, no cookies for tracking and no API keys. Browser geolocation is requested only after a click. Place/postal-code search sends the search term to Open-Meteo Geocoding. Saved locations are stored only if the user explicitly saves them locally.

See `PRIVACY.md`.
