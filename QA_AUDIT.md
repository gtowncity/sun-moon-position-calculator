# QA_AUDIT.md

## Summary

- Overall status: Targeted functional QA fixes were implemented and the full Playwright audit completes.
- Critical blockers: 0
- High issues fixed in this pass: QA-001, QA-002, QA-003, QA-004, QA-005
- Medium/important issues fixed in this pass: QA-006, QA-007, QA-008, QA-011
- Remaining product/UX follow-ups: mobile density, CRT readability for dense tables, screenshot artifact size.
- Audit artifacts: 176 PNG screenshots plus `runtime-log.json` in `design-review/full-audit/`.
- Screenshot size note: PNG files total about 143.32 MB; largest single file is about 1.78 MB. No single PNG exceeds GitHub file limits.
- Astronomy guardrails: No NREL-SPA code was introduced or copied. No JPL Horizons reference values were invented.

## Tested Environment

- Browser: Playwright Chromium
- Viewports: 1440 x 1100, 1920 x 1080, 768 x 1024, 390 x 844
- Date: 2026-07-06
- Fix branch/base commit before this worktree: `9732409`
- URL: `http://127.0.0.1:5173/`
- Runner: local repo Node runtime `.tools/node-v24.18.0-win-x64`
- Main audit command: `npm run audit:site`
- Main audit result: PASS, 10/10 Playwright audit groups
- Runtime log: `design-review/full-audit/runtime-log.json`
- Test data: Berlin, Geiselhöring/Geiselhoering/94333, London, New York, Tromsø, equator coordinates, Europe/Berlin, UTC, America/New_York, Australia/Sydney, Europe/London, summer/winter/DST/high-latitude/equator dates.

## Scenario Matrix

| Area | Scenario | Status | Screenshot | Notes |
|---|---|---|---|---|
| Initial | Fresh desktop load | PASS | `design-review/full-audit/initial-desktop.png` | App loads without blocking errors. |
| Initial | Fresh mobile load | PASS with follow-up | `design-review/full-audit/initial-mobile.png` | Functional but still dense on small screens. |
| Language | English/German toggle | PASS | `design-review/full-audit/language-en.png`, `design-review/full-audit/language-de.png` | Main controls remain localized. |
| CRT | On/off | PASS with follow-up | `design-review/full-audit/crt-on.png`, `design-review/full-audit/crt-off.png` | OFF remains easier for dense data. |
| Modes | Single instant | PASS | `design-review/full-audit/mode-single-time.png` | Time input and instant-specific action are visible. |
| Modes | One night | PASS | `design-review/full-audit/mode-one-night.png` | Night range remains clear. |
| Modes | Multiple nights | PASS | `design-review/full-audit/mode-multi-night.png` | Presets remain visible. |
| Modes | Custom | PASS | `design-review/full-audit/mode-custom.png` | Custom range remains functional. |
| Night cases | Summer/no astro night | PASS | `design-review/full-audit/night-summer-no-astro.png` | No -18 degree window is explained. |
| Night cases | Winter/good window | PASS | `design-review/full-audit/night-winter-good.png` | Effective window appears. |
| Night cases | DST/high latitude/equator | PASS | `design-review/full-audit/night-dst-transition.png` | No crashes in edge scenarios. |
| Imaging | Strict/balanced/bright | PASS | `design-review/full-audit/imaging-balanced.png` | Focus now follows the recalculated effective/best window. |
| Target | Sun only | PASS | `design-review/full-audit/target-sun.png` | Sun rows and analysis visible. |
| Target | Moon only | PASS | `design-review/full-audit/target-moon.png` | Data grid shows Moon rows; night analysis uses hidden Sun altitude internally. |
| Target | Sun and Moon | PASS | `design-review/full-audit/target-both.png` | Both bodies visible. |
| Location | Manual valid/invalid | PASS | `design-review/full-audit/manual-location-valid.png` | Validation prevents invalid coordinates from producing results. |
| Geocoding | Berlin | PASS | `design-review/full-audit/geocoding-berlin.png` | Open-Meteo result list renders and is not auto-applied. |
| Geocoding | 94333 fallback | PASS | `design-review/full-audit/geocoding-plz.png` | Network failure diagnosis plus local Geiselhöring fallback renders. |
| Geocoding | No result query | PASS | `design-review/full-audit/geocoding-no-result.png` | Empty result state is distinct from network failure. |
| Geocoding | Multiple results | PASS | `design-review/full-audit/geocoding-multiple-results.png` | Multiple London results are selectable. |
| GPS | Success/denied/unavailable | PASS | `design-review/full-audit/gps-denied.png` | GPS errors are differentiated. |
| Saved locations | Create/apply/delete | PASS | `design-review/full-audit/saved-location-created.png` | localStorage flow remains functional. |
| Timezone | Berlin/UTC/New York/Sydney/London | PASS | `design-review/full-audit/tz-new-york.png` | Timezone changes do not crash. |
| Interval | Standard/custom/invalid | PASS | `design-review/full-audit/interval-custom-invalid-zero.png` | Invalid intervals are rejected. |
| Refraction | None/standard/custom | PASS | `design-review/full-audit/refraction-standard.png` | Refraction is now available under calculation options. |
| Timeline/chart/compass | Hover/click/focus | PASS | `design-review/full-audit/timeline-click-focus.png` | Focus remains synchronized. |
| Moon impact | Low/medium scenarios | PASS | `design-review/full-audit/moon-impact-medium.png` | Target separation limitation remains documented. |
| Multi-night planner | 3/7/14/30 | PASS with follow-up | `design-review/full-audit/multi-30.png` | Functional but visually heavy. |
| Details | Event/detail panels | PASS | `design-review/full-audit/detail-event-log.png` | Duplicate React key warnings fixed. |
| Data grid | Filter/search/sort | PASS | `design-review/full-audit/grid-sort-altitude.png` | Sort controls exist and survive filtering/search. |
| Export | XLSX/TXT/Markdown | PASS | `design-review/full-audit/export-panel.png` | CSV is no longer active; XLSX/TXT/Markdown download. |
| Responsive | Mobile/tablet/desktop/large | PASS with follow-up | `design-review/full-audit/responsive-mobile-top.png` | No global overflow crash; mobile density remains. |
| Keyboard | Controls/timeline/grid | PASS | `design-review/full-audit/keyboard-focus-grid.png` | Basic focus states are present. |

## Runtime Observations

- Console warnings captured: 0
- Console errors captured: 1
- Page errors captured: 0
- Request failures captured: 1
- Notes captured: 8
- The single console error/request failure is expected from the mocked 94333 Open-Meteo network failure used to verify local fallback and diagnostics.
- Duplicate React key warnings for missing events are no longer present.
- Export notes recorded XLSX, TXT and Markdown downloads. CSV is intentionally absent from the active UI.

## Findings

### QA-001: Browser geocoding diagnostics and fallback

Severity: HIGH

Status: FIXED

Expected:
Online searches show results when available. Network/HTTP failures show actionable diagnostics, request URL/API-test link, and manual-coordinate guidance. Geiselhöring/Geiselhoering/94333 show a local fallback when online lookup fails.

Actual after fix:
Berlin and London render mocked Open-Meteo result lists. `94333` renders network diagnostics plus the local Geiselhöring fallback. Empty-result queries stay distinct from network failures.

Screenshots:
`design-review/full-audit/geocoding-berlin.png`, `design-review/full-audit/geocoding-plz.png`, `design-review/full-audit/geocoding-no-result.png`, `design-review/full-audit/geocoding-multiple-results.png`

Affected files:
`src/lib/geocoding/openMeteo.ts`, `src/lib/geocoding/localFallback.ts`, `src/app/App.tsx`, `src/components/dashboard/ControlPanel.tsx`

### QA-002: Moon-only target breaks night analysis

Severity: HIGH

Status: FIXED

Expected:
Moon-only result tables should show only Moon rows while night analysis still uses internal Sun altitude for twilight/effective-window calculations.

Actual after fix:
Moon-only mode shows Moon rows in the grid/export path and a note that night analysis also uses internal Sun altitude. Hero/timeline no longer show the misleading `No results yet` state.

Screenshot:
`design-review/full-audit/target-moon.png`

Affected files:
`src/app/App.tsx`, `src/components/AstroDashboard.tsx`, `src/components/dashboard/TerminalHero.tsx`

### QA-003: Single instant mode lacks clear time/action state

Severity: HIGH

Status: FIXED

Expected:
Single instant exposes date, time and timezone and uses an instant-specific primary action.

Actual after fix:
The mode shows the time input, uses `Calculate instant`/`Zeitpunkt berechnen`, and the hero presents an instant result rather than an effective night window.

Screenshot:
`design-review/full-audit/mode-single-time.png`

Affected files:
`src/components/dashboard/ControlPanel.tsx`, `src/components/dashboard/TerminalHero.tsx`, `src/components/AstroDashboard.tsx`

### QA-004: Imaging mode changes leave stale focus

Severity: HIGH

Status: FIXED

Expected:
Changing strict/balanced/bright recomputes the effective window and moves focus to the new effective start, best window, or first sample fallback.

Actual after fix:
`handleImagingMode` recalculates insight from existing rows and resets `focusedUtc`, keeping hero, timeline, chart, compass and focused grid row synchronized.

Screenshots:
`design-review/full-audit/imaging-strict.png`, `design-review/full-audit/imaging-balanced.png`, `design-review/full-audit/imaging-bright.png`

Affected files:
`src/app/App.tsx`

### QA-005: Data grid sorting missing

Severity: HIGH

Status: FIXED

Expected:
Grid sorting should support UTC, local time, body, azimuth, apparent altitude, geometric altitude and illumination, with asc/desc control.

Actual after fix:
Sort controls are visible, keyboard-accessible as form controls, retain body filter/search state, and handle null values last.

Screenshot:
`design-review/full-audit/grid-sort-altitude.png`

Affected files:
`src/components/dashboard/ResultDataGrid.tsx`

### QA-006: Duplicate React keys for missing event rows

Severity: MEDIUM

Status: FIXED

Expected:
Missing events render without React duplicate-key warnings.

Actual after fix:
Event keys include body, kind, status, local date/UTC fallback and index. Runtime console warnings are 0.

Screenshot:
`design-review/full-audit/detail-event-log.png`

Affected files:
`src/components/dashboard/utils.ts`, `src/components/dashboard/EventLog.tsx`, `src/components/dashboard/DetailReport.tsx`

### QA-007: GPS error states too coarse

Severity: MEDIUM

Status: FIXED

Expected:
Denied, unavailable, timeout, unsupported and unknown geolocation states should be distinguishable.

Actual after fix:
Geolocation errors map to separate i18n messages and suggest manual coordinates or place search.

Screenshots:
`design-review/full-audit/gps-denied.png`, `design-review/full-audit/gps-unavailable.png`

Affected files:
`src/lib/location/geolocation.ts`, `src/app/App.tsx`, `src/i18n/en.json`, `src/i18n/de.json`

### QA-008: CSV remains active despite product scope

Severity: MEDIUM

Status: FIXED

Expected:
Active exports are XLSX, TXT and Markdown only.

Actual after fix:
CSV button, active CSV app wiring, i18n label and CSV tests were removed. XLSX/TXT/Markdown remain active.

Screenshot:
`design-review/full-audit/export-panel.png`

Affected files:
`src/components/dashboard/ExportPanel.tsx`, `src/components/dashboard/ResultDataGrid.tsx`, `src/app/App.tsx`, `src/export/index.ts`, `tests/export.test.ts`, `tests/e2e/app.spec.ts`

### QA-011: Refraction controls are hidden in location editor

Severity: LOW

Status: FIXED

Expected:
Refraction should be discoverable as a calculation option.

Actual after fix:
Refraction now appears in its own calculation-options fieldset with custom pressure/temperature controls when relevant.

Screenshot:
`design-review/full-audit/refraction-standard.png`

Affected files:
`src/components/dashboard/ControlPanel.tsx`, `src/styles.css`

## Remaining Follow-Ups

- Mobile layout remains dense and should be handled in a later design pass, not in this functional fix pass.
- CRT FX ON is still less readable for dense numerical review; CRT FX OFF remains the practical option for data-heavy work.
- Full audit PNG artifacts are large as a set. Keep them because the user explicitly requested committed screenshots, but prefer curated artifact strategy later.
- One expected console error/request failure remains in `geocoding-plz` because the audit deliberately mocks an Open-Meteo network failure.

## Verification Commands

Commands run successfully during this fix pass before the clean install:

```text
npm run build
npm test
npm run audit:site
```

Results:

```text
npm run build: PASS. Vite reported a non-fatal large chunk warning.
npm test: PASS, 17 test files, 61 tests.
npm run audit:site: PASS, 10 Playwright audit tests.
```

Final clean-install verification was run before commit:

```text
rm -rf node_modules
npm ci
npm run build
npm test
npm run screenshot:design
npm run test:e2e
npm run audit:site
```

Results:

```text
rm -rf node_modules: PASS, removed workspace node_modules after path verification.
npm ci: PASS, 222 packages installed, 0 vulnerabilities.
npm run build: PASS. Vite reported a non-fatal large chunk warning.
npm test: PASS, 17 test files, 61 tests.
npm run screenshot:design: PASS, 1 Playwright test.
npm run test:e2e: PASS, 12 Playwright tests.
npm run audit:site: PASS, 10 Playwright audit tests.
```

## Recommended Follow-Up Prompt

```text
Bitte behebe als naechstes nur die verbliebenen UX-Follow-ups aus QA_AUDIT.md: mobile Dichte, CRT-Lesbarkeit und ggf. eine schlankere Screenshot-Artefakt-Strategie. Keine weiteren Astro-Algorithmus-Aenderungen, kein NREL-SPA-Code und keine erfundenen JPL-Horizons-Werte.
```
