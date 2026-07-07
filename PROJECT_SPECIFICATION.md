# Project Specification: Sun/Moon Position Calculator

## 1. Target

Build a precise browser-based web tool for calculating:

- current Sun position;
- current Moon position;
- interval-based Sun position;
- interval-based Moon position;
- combined Sun + Moon result tables.

The tool must support:

- observer location;
- date;
- local time;
- IANA time zone;
- optional elevation above sea level;
- configurable time interval;
- German and English UI/export text;
- export to CSV, XLSX, TXT and Markdown.

The highest priority is astronomical traceability. The project must not rely on unvalidated simplified solar-calculator formulas for precision claims.

## 2. Algorithm and reference strategy

### Sun

Primary target method: NREL SPA-compatible solar pipeline.

Requirements:

- topocentric azimuth;
- topocentric altitude;
- zenith angle;
- geometric and apparent values separated where possible;
- sunrise;
- sunset;
- transit / solar noon;
- optional equation of time.

Important licensing note: the official NREL SPA C code must not be copied blindly into this public repository. Use either a clean-room TypeScript implementation based on published formulas, or a clearly compatible third-party implementation after license review.

Until this is done and validated, the app must not claim NREL-SPA-level runtime accuracy.

### Moon

Primary runtime method: `astronomy-engine`.

Reasoning:

- JavaScript/TypeScript and browser/Node support;
- Sun/Moon/planet support;
- rise/set search;
- coordinate transformations;
- topocentric/horizontal calculations;
- suitable for a target Moon accuracy below 0.1 deg when validated.

Moon output requirements:

- topocentric azimuth;
- topocentric altitude;
- apparent/geometric zenith where available;
- topocentric RA/Dec if available;
- distance;
- phase angle;
- illumination;
- moonrise;
- moonset;
- culmination / transit.

### Validation references

Primary external validation reference: NASA/JPL Horizons observer tables for topocentric observer data.

Additional references:

- NREL SPA example/reference cases for solar validation;
- NOAA solar calculator only as a plausibility/sanity comparison, not as the primary reference.

No generated or placeholder reference values may be presented as real astronomical validation data.

## 3. Accuracy goals

| Quantity | Target | Reference |
|---|---:|---|
| Sun azimuth | < 0.01 deg | NREL SPA / JPL Horizons |
| Sun altitude | < 0.01 deg | NREL SPA / JPL Horizons |
| Sun zenith angle | < 0.01 deg | NREL SPA / JPL Horizons |
| Moon azimuth | preferably < 0.1 deg | JPL Horizons |
| Moon altitude | preferably < 0.1 deg | JPL Horizons |
| Sunrise / sunset | < 1 min | NREL/JPL/NOAA comparison |
| Moonrise / moonset | realistic target < 1-2 min, preferably < 1 min | JPL Horizons |
| Interval timestamps | exactly reproducible | internal time-zone and DST tests |

Refractive effects, pressure, temperature, humidity and the local physical horizon can shift real observed rise/set times. The app must communicate this clearly.

## 4. Preferred stack

- Vite;
- React;
- TypeScript;
- Vitest;
- Playwright;
- `astronomy-engine`;
- `@js-temporal/polyfill`;
- SheetJS or existing XLSX-capable export implementation;
- optional Zod for input validation;
- optional TanStack Table or virtualization for large result tables.

## 5. Architecture principles

- UI components must not contain astronomical formulas.
- Astro/domain logic must not depend on React.
- Exports must use the same data model as the visible table.
- Validation tests must call astro modules directly.
- Runtime algorithms, validation references and UI presentation must be documented separately.

Suggested structure:

```text
src/
  app/
  components/
  domain/
  astro/
    solar/
      spa/
      solarTypes.ts
    lunar/
      moonEngine.ts
    common/
      coordinates.ts
      refraction.ts
      timeScales.ts
      julian.ts
      interval.ts
      events.ts
  geocoding/
  timezone/
  export/
  i18n/
  validation/
  tests/
docs/
validation/
  references/
  scripts/
```

Existing `src/lib/*` modules may remain as adapters during migration if that lowers regression risk.

## 6. UI/UX requirements

The interface should expose clear blocks:

- calculation target: Sun, Moon, both;
- location: manual coordinates, optional elevation, browser geolocation, place search, postal-code search, location source display;
- time: date picker, date text field, time, time-zone dropdown, current-time button, auto-fill button;
- interval: single instant, start/end, start + duration, 1-60 minute presets, custom interval, max-row protection;
- options: DE/EN, refraction off/standard/custom, pressure/temperature, decimal degree/DMS, local+UTC/only local;
- output: result table, current summary cards, events, export buttons.

The current stylistic shell may be retro/terminal-inspired, but it must not obscure accuracy status, warnings or algorithm notes.

## 7. Core data model

### CalculationRequest

```ts
type CalculationRequest = {
  targets: 'sun' | 'moon' | 'both';
  observer: {
    latitudeDeg: number;
    longitudeDeg: number;
    elevationMeters?: number;
    source: 'manual' | 'browser' | 'geocoding' | 'postal';
  };
  time: {
    timezoneIana: string;
    startLocal: string;
    endLocal?: string;
    durationMinutes?: number;
    intervalMinutes: number;
    disambiguation?: 'earlier' | 'later' | 'compatible' | 'reject';
  };
  options: {
    language: 'de' | 'en';
    refractionMode: 'none' | 'standard' | 'custom';
    pressureHPa?: number;
    temperatureC?: number;
    outputPrecision?: number;
  };
};
```

### PositionRow

```ts
type PositionRow = {
  index: number;
  object: 'Sun' | 'Moon';
  localDateTime: string;
  timezone: string;
  utcDateTime: string;
  julianDay: number;
  azimuthDeg: number;
  altitudeDegApparent: number;
  altitudeDegGeometric: number;
  zenithDegApparent: number;
  zenithDegGeometric: number;
  rightAscension?: string | number;
  declination?: string | number;
  distanceKm?: number;
  phaseAngleDeg?: number;
  illuminationPercent?: number;
  eventFlags?: string[];
  notes?: string[];
  warnings?: string[];
};
```

### ExportMetadata

```ts
type ExportMetadata = {
  appVersion: string;
  algorithmVersion: string;
  generatedAtUtc: string;
  observer: unknown;
  timezone: string;
  interval: unknown;
  algorithms: unknown;
  validationNotice: string;
  refractionMode: string;
};
```

## 8. Time-zone and DST strategy

Rules:

- Never use a fixed offset like UTC+1 as the calculation basis.
- User-facing input time zone must be IANA, for example `Europe/Berlin`.
- Browser time zone may be used as default via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- Internally every local time must be converted to an unambiguous UTC instant.
- Interval stepping must normally run over true elapsed time / UTC instants.
- Display must convert instants back into the selected IANA time zone.
- DST gaps must be detected and rejected or explained.
- DST duplicated local times must require or document an `earlier`/`later` strategy.
- Exports must always contain local time and UTC time.

## 9. Interval logic

Supported modes:

| Mode | Meaning |
|---|---|
| Single instant | one row per selected object |
| Start + end | include start; include end only if exactly hit or documented |
| Start + duration | duration in minutes/hours/days |
| Current instant | now from browser time and selected IANA zone |
| Astro night | selected evening date to following morning |

Rules:

- Standard interval: 1-60 minutes.
- Custom interval allowed with validation.
- Max result protection target: 10,000 result rows.
- For `both`, one time step produces two result rows.
- Very large ranges must show warnings before calculation/export.

## 10. Export requirements

Formats:

- CSV;
- XLSX;
- TXT;
- Markdown.

CSV:

- UTF-8;
- comma or semicolon option;
- decimal point for machine-readable numeric values;
- optional metadata comments or separate metadata export.

XLSX sheets:

- `Results`;
- `Metadata`;
- `Events`;
- `ValidationInfo`.

TXT:

- readable report;
- input data;
- summary;
- monospaced table.

Markdown:

- metadata block;
- result table;
- warnings;
- algorithm/source notes.

## 11. Internationalization

- Required languages: German and English.
- All UI labels should use i18n keys.
- Export headings must be translatable.
- Algorithm identifiers remain stable and should not be localized if used for validation/auditing.
- UI numbers may be localized.
- Raw export values should remain machine-readable.

## 12. Validation fixtures

Required validation cases:

- NREL SPA solar reference case;
- Sun Berlin summer;
- Sun Berlin winter;
- Moon Berlin;
- Moon near horizon;
- equator;
- high-latitude northern hemisphere;
- southern hemisphere;
- DST spring-forward Europe/Berlin;
- DST fall-back Europe/Berlin.

Fixture schema must include:

- source;
- retrieval date;
- target body;
- observer location and elevation;
- time zone;
- UTC instant;
- expected azimuth;
- expected altitude;
- tolerance;
- refraction notes.

## 13. Tests

Unit tests:

- coordinate validation;
- DMS/decimal conversion;
- time-zone resolution;
- DST gaps;
- DST duplicate times;
- interval generator;
- export data model;
- refraction options.

Astro tests:

- Sun position against real NREL/JPL fixtures;
- Moon position against real JPL fixtures;
- rise/set against fixtures;
- polar no-rise/no-set cases.

UI/E2E tests:

- manual coordinates;
- denied geolocation;
- place search;
- Sun/Moon/Both toggle;
- export buttons;
- DE/EN language switch.

Regression tests:

- numerical tolerance snapshots, not purely visual snapshots.

## 14. Error handling

Every error should have a short UI message and optional technical details. The app must not crash for:

- invalid coordinates;
- invalid elevation;
- invalid time zone;
- nonexistent local time;
- duplicated local time;
- invalid interval;
- too many result rows;
- geolocation denied;
- geolocation unavailable;
- geocoding no result;
- geocoding network error;
- no rise/set in selected window;
- unreliable refraction near horizon.

## 15. Privacy

- Browser geolocation only after explicit permission.
- Coordinates must not be sent to an own backend.
- Geocoding sends the search text to an external service and must be labeled as such.
- No API keys in the repository.
- No analytics.
- No precise location storage except optional local browser storage.
- “Auto detect all” may request location only through the browser permission flow.

## 16. Performance

- Use max-row limits.
- Consider Web Workers for large ranges.
- Use table virtualization for large result sets.
- Export asynchronously.
- Memoize result sets by request hash where useful.

## 17. Accessibility

- Keyboard operation;
- visible focus states;
- labels for inputs;
- real table headers;
- `aria-live` for errors;
- sufficient contrast;
- no color-only communication;
- responsive layout.

## 18. Required documentation

Root/project documentation should include:

- `README.md`;
- `PLANNING.md`;
- `ACCURACY.md`;
- `ALGORITHMS.md`;
- `VALIDATION.md`;
- `PRIVACY.md`;
- `LIMITATIONS.md`;
- `CHANGELOG.md`.

These documents must clearly separate current implementation state from target accuracy claims.

## 19. Known limits and risks

- NREL SPA source-code licensing must be respected.
- Refraction is weather-dependent.
- Local horizon, mountains, buildings and trees are not modeled.
- JPL Horizons is a validation reference, not a runtime dependency.
- Moonrise/moonset is harder than sunrise/sunset.
- Time-zone rules can change politically.
- Native Temporal support is not universal.
- Geocoding can return wrong or ambiguous places.
- Postal-code search is country-dependent and ambiguous.
- Polar regions can have no rise/set events.
- Values close to the horizon are less reliable.
- High mathematical precision does not guarantee equal real-world visibility.

## 20. Implementation priority

1. Preserve honest accuracy documentation.
2. Add real external validation fixtures.
3. Decide solar runtime path: clean SPA implementation or clearly documented Astronomy Engine tolerance.
4. Ensure complete CSV/XLSX/TXT/Markdown export coverage.
5. Complete time-zone/DST edge-case tests.
6. Complete rise/set/transit validation.
7. Keep UI warnings visible and non-optional.
