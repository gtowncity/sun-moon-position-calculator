# VALIDATION.md

## Purpose

Validation fixtures document external reference values used to check runtime calculations. They are not runtime dependencies.

## JPL Horizons

JPL Horizons should be used to generate topocentric Sun and Moon reference values for selected observer locations and UTC instants. Each committed fixture must include:

- source and retrieval date;
- target body;
- observer latitude, longitude and elevation;
- IANA time zone used by the app;
- UTC instant;
- expected azimuth;
- expected altitude/elevation;
- tolerance;
- refraction mode and notes.

Fixtures with `TODO_REFERENCE_VALUE` are structural placeholders only. Tests must not treat them as real pass/fail reference values.

## NREL Reference Cases

For solar validation, add NREL-SPA-compatible reference cases where licensing and source provenance are clear. The app should compare azimuth, geometric/apparent altitude and zenith angle within documented tolerances.

## Initial Fixture Set

The repository contains placeholder JSON files for:

1. Berlin summer date
2. Berlin winter date
3. Greenwich
4. New York
5. Sydney
6. Tromso/high latitude no-rise/no-set scenario
7. Equator-near case
8. Moon near horizon
9. Sun near horizon
10. Europe/Berlin spring-forward DST case
11. Europe/Berlin fall-back DST case

## How to Add Real Fixtures

1. Query JPL Horizons for the body, observer and UTC instant.
2. Use topocentric apparent coordinates and record the refraction setting.
3. Store raw query URL or exact query parameters.
4. Replace only `TODO_REFERENCE_VALUE` fields with real values.
5. Set realistic tolerances per fixture.
6. Add or enable a Vitest case that skips TODO fixtures and asserts real fixtures.

## Running Tests

```bash
npm test
```

E2E tests, if Playwright dependencies and browser binaries are installed:

```bash
npm run test:e2e
```

## NOAA

NOAA solar tools may be used for plausibility checks only. NOAA is not the primary precision reference for this project, and atmospheric refraction differs with real weather.
