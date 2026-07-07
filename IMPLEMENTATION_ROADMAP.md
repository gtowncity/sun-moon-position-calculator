# Implementation Roadmap

This roadmap turns `PROJECT_SPECIFICATION.md` into concrete implementation work. It intentionally separates current runtime state from future accuracy claims.

## Phase 0 - Repository truth check

- [ ] Confirm whether CSV export is currently present in code and UI.
- [ ] Align `README.md`, `CHANGELOG.md` and export UI wording if they disagree.
- [ ] Confirm current source layout and decide whether to migrate from `src/lib/*` into `src/astro/*`, `src/export/*`, `src/timezone/*` or keep compatibility adapters.
- [ ] Keep all docs honest: no NREL-SPA-level claim until validated fixtures and a clean implementation exist.

## Phase 1 - Domain model lock-in

- [ ] Introduce or normalize `CalculationRequest`.
- [ ] Introduce or normalize `PositionRow`.
- [ ] Introduce or normalize `ExportMetadata`.
- [ ] Ensure table, exports and validation tests use the same model.
- [ ] Add explicit fields for geometric/apparent altitude and zenith.
- [ ] Add stable algorithm identifiers and algorithm version metadata.

## Phase 2 - Time, time zones and intervals

- [ ] Keep IANA zone as the only accepted time-zone model.
- [ ] Keep interval stepping in UTC/`Temporal.Instant` steps.
- [ ] Add or verify tests for Europe/Berlin spring-forward nonexistent time.
- [ ] Add or verify tests for Europe/Berlin fall-back ambiguous time.
- [ ] Expose documented disambiguation behavior in UI and exports.
- [ ] Enforce max result rows; target 10,000 result rows.
- [ ] Ensure `both` counts as two rows per time step.

## Phase 3 - Solar pipeline

- [ ] Decide final solar runtime path:
  - clean-room SPA-compatible TypeScript implementation, or
  - documented `astronomy-engine` solar runtime with adjusted tolerance claims.
- [ ] Do not copy official NREL SPA C source code.
- [ ] Add solar algorithm metadata into exports.
- [ ] Add NREL-compatible solar reference fixture(s) with real values.
- [ ] Add JPL Horizons solar fixture(s) with real topocentric observer values.
- [ ] Add numerical tests for solar azimuth, altitude and zenith.
- [ ] Keep NOAA as sanity comparison only.

## Phase 4 - Lunar pipeline

- [ ] Keep `astronomy-engine` as the primary Moon runtime unless replaced by a clearly superior validated path.
- [ ] Confirm topocentric observer handling and lunar parallax in tests/docs.
- [ ] Export Moon distance, illumination and phase angle where reliable.
- [ ] Add JPL Horizons Moon fixtures.
- [ ] Add Moon near-horizon fixture and warning behavior.
- [ ] Add numerical tests for Moon azimuth and altitude with realistic tolerance.

## Phase 5 - Events

- [ ] Solar sunrise, sunset and transit / solar noon.
- [ ] Moonrise, moonset and culmination / transit.
- [ ] Handle no-rise/no-set results without crashes.
- [ ] Add polar/high-latitude tests.
- [ ] Add event rows/sheet entries to exports.
- [ ] Document refraction/horizon limits for event times.

## Phase 6 - Refraction

- [ ] Modes: `none`, `standard`, `custom`.
- [ ] Custom pressure hPa and temperature C.
- [ ] Separate geometric and apparent values.
- [ ] Add near-horizon reliability warnings.
- [ ] Document that humidity/local horizon/terrain are not modeled.

## Phase 7 - Exports

- [ ] CSV: UTF-8, machine-readable numbers, comma/semicolon option.
- [ ] XLSX sheets: `Results`, `Metadata`, `Events`, `ValidationInfo`.
- [ ] TXT readable report with input, summary and monospaced table.
- [ ] Markdown metadata block, result table, warnings and algorithm notes.
- [ ] Ensure all exports include local time and UTC time.
- [ ] Ensure exports include validation/accuracy notice.
- [ ] Add export tests against normalized data models.

## Phase 8 - UI/UX

- [ ] Targets: Sun, Moon, both.
- [ ] Location: manual, browser, geocoding, postal search, elevation.
- [ ] Display location source.
- [ ] Time controls: date picker, text date, time, IANA zone, now, auto-fill.
- [ ] Interval modes: single instant, start/end, start+duration, astro night.
- [ ] Options: language, refraction, pressure/temperature, degree format, time format.
- [ ] Summary cards for current Sun/Moon values.
- [ ] Events section.
- [ ] Export buttons for all supported formats.
- [ ] Keep accuracy warnings visible.

## Phase 9 - Internationalization

- [ ] German and English labels.
- [ ] No hardcoded user-facing strings in components where feasible.
- [ ] Translated export headings.
- [ ] Stable algorithm identifiers.
- [ ] Localized UI number formatting.
- [ ] Machine-readable raw export values.

## Phase 10 - Validation workflow

- [ ] Create/complete `validation/references/*.json`.
- [ ] Add source, retrieval date and exact query parameters for each fixture.
- [ ] Add scripts or docs for JPL Horizons fixture retrieval.
- [ ] Tests must skip `TODO_REFERENCE_VALUE` placeholders.
- [ ] Tests must fail only against real committed values.
- [ ] Add tolerances per fixture.

## Phase 11 - E2E and accessibility

- [ ] Playwright: manual coordinates.
- [ ] Playwright: geolocation denied.
- [ ] Playwright: geocoding search.
- [ ] Playwright: Sun/Moon/Both switching.
- [ ] Playwright: export buttons.
- [ ] Playwright: DE/EN switch.
- [ ] Keyboard navigation.
- [ ] Focus states.
- [ ] `aria-live` for errors.
- [ ] Real table headers.
- [ ] Sufficient contrast and no color-only status communication.

## Phase 12 - Performance

- [ ] Max-row warning and hard stop.
- [ ] Consider Web Worker calculation for large ranges.
- [ ] Consider table virtualization.
- [ ] Async export for large files.
- [ ] Memoize by request hash where safe.

## Acceptance criteria

A release may claim the target accuracy only when:

1. the solar runtime path is cleanly licensed and documented;
2. real NREL/JPL fixtures are committed;
3. automated tests compare against those fixtures within stated tolerances;
4. exports include algorithm and validation metadata;
5. docs clearly state known limits around refraction, local horizon, time zones and polar cases.
