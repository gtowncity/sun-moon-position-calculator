# QA_AUDIT.md

## Summary

- Overall status: The application loads and the full audit script completes, but several product-critical UX/state issues remain.
- Critical blockers: 0
- High issues: 5
- Medium issues: 5
- Low issues: 2
- Audit artifacts: 176 PNG screenshots plus `runtime-log.json` in `design-review/full-audit/`.
- Screenshot size note: PNG files total about 141.84 MB; largest single file is about 1.77 MB. No local PNG optimizer was available, and all files are below GitHub's single-file limit.
- Astronomy guardrails: No NREL-SPA code was introduced or copied. No JPL Horizons reference values were invented.

## Tested Environment

- Browser: Playwright Chromium
- Viewports: 1440 x 1100, 1920 x 1080, 768 x 1024, 390 x 844
- Date: 2026-07-06
- Baseline commit before audit artifacts: `437cae8`
- URL: `http://127.0.0.1:5173/`
- Runner: local repo Node runtime `.tools/node-v24.18.0-win-x64`
- Main audit command: `npm run audit:site`
- Main audit result: PASS, 10/10 Playwright audit groups
- Runtime log: `design-review/full-audit/runtime-log.json`
- Test data: Berlin, Geiselhoering/94333, London, New York, Tromso, equator coordinates, Europe/Berlin, UTC, America/New_York, Australia/Sydney, Europe/London, summer/winter/DST/high-latitude/equator dates.

## Scenario Matrix

| Area | Scenario | Status | Screenshot | Notes |
|---|---|---|---|---|
| Initial | Fresh desktop load | PASS with issues | `design-review/full-audit/initial-desktop.png` | App loads, but default page is very long and dense. |
| Initial | Fresh mobile load | PASS with issues | `design-review/full-audit/initial-mobile.png` | Usable but extremely narrow/dense. |
| Language | English | PASS | `design-review/full-audit/language-en.png` | English labels mostly consistent. |
| Language | German | PASS | `design-review/full-audit/language-de.png` | German labels mostly consistent. |
| CRT | CRT FX ON | PASS with issue | `design-review/full-audit/crt-on.png` | Readability is stylized and tiring for dense data. |
| CRT | CRT FX OFF | PASS | `design-review/full-audit/crt-off.png` | Better readability. |
| Modes | Single instant | FAIL UX | `design-review/full-audit/mode-single-time.png` | No clear visible time input for a single instant. |
| Modes | One night | PASS | `design-review/full-audit/mode-one-night.png` | Night label is visible. |
| Modes | Multiple nights | PASS | `design-review/full-audit/mode-multi-night.png` | Presets are visible. |
| Modes | Custom | PASS with issue | `design-review/full-audit/mode-custom.png` | Custom range controls need clearer start/end semantics. |
| Night cases | Summer Germany | PASS | `design-review/full-audit/night-summer-no-astro.png` | Correctly communicates no -18 deg astronomical night in range. |
| Night cases | Winter Germany | PASS | `design-review/full-audit/night-winter-good.png` | Effective window appears. |
| Night cases | DST transition | PASS with risk | `design-review/full-audit/night-dst-transition.png` | No crash; still needs targeted DST assertions outside screenshot audit. |
| Night cases | High latitude | PASS | `design-review/full-audit/night-high-latitude.png` | No effective astronomical window communicated. |
| Night cases | Equator | PASS | `design-review/full-audit/night-equator.png` | Distinct night pattern appears. |
| Imaging | Strict DSO | PASS with state risk | `design-review/full-audit/imaging-strict.png` | Derived insight changes, but focus time is not reset. |
| Imaging | Balanced DSO | PASS with state risk | `design-review/full-audit/imaging-balanced.png` | Focus/compass may remain on previous sample. |
| Imaging | Bright targets | PASS with state risk | `design-review/full-audit/imaging-bright.png` | Needs explicit synchronization. |
| Target | Sun only | PASS | `design-review/full-audit/target-sun.png` | Sun rows and analysis visible. |
| Target | Moon only | FAIL UX/state | `design-review/full-audit/target-moon.png` | Moon rows exist but night analysis says "No results yet." |
| Target | Sun and Moon | PASS | `design-review/full-audit/target-both.png` | Both bodies visible. |
| Location | Manual valid | PASS | `design-review/full-audit/manual-location-valid.png` | Valid coordinates accepted. |
| Location | Invalid latitude | PASS | `design-review/full-audit/manual-location-invalid-lat.png` | Error shown without crash. |
| Location | Invalid longitude | PASS | `design-review/full-audit/manual-location-invalid-lon.png` | Error shown without crash. |
| Location | Empty coordinates | PASS | `design-review/full-audit/manual-location-empty.png` | Error shown without crash. |
| Geocoding | Berlin | FAIL | `design-review/full-audit/geocoding-berlin.png` | Browser returns generic network error. |
| Geocoding | 94333 | FAIL | `design-review/full-audit/geocoding-plz.png` | No online result, no fallback rendered. |
| Geocoding | No result query | FAIL diagnosis | `design-review/full-audit/geocoding-no-result.png` | Same generic network error; no distinction from empty result. |
| Geocoding | London | FAIL | `design-review/full-audit/geocoding-multiple-results.png` | No multiple result list appears. |
| GPS | Success mock | PASS | `design-review/full-audit/gps-success.png` | Mocked geolocation applies. |
| GPS | Denied mock | PASS with issue | `design-review/full-audit/gps-denied.png` | Error messaging is coarse. |
| GPS | Unavailable mock | PASS with issue | `design-review/full-audit/gps-unavailable.png` | Unavailable is not clearly distinguished from denial. |
| Saved locations | Empty | PASS | `design-review/full-audit/saved-location-empty.png` | Empty state visible. |
| Saved locations | Created | PASS | `design-review/full-audit/saved-location-created.png` | Save works. |
| Saved locations | Applied | PASS | `design-review/full-audit/saved-location-applied.png` | Apply works. |
| Saved locations | Deleted | PASS | `design-review/full-audit/saved-location-deleted.png` | Delete works. |
| Timezone | Berlin/UTC/New York/Sydney/London | PASS | `design-review/full-audit/tz-berlin.png` | Timezone changes do not crash. |
| Interval | 1/60/custom valid | PASS | `design-review/full-audit/interval-custom-valid.png` | Rows update. |
| Interval | Custom zero/too large | PASS with issue | `design-review/full-audit/interval-custom-invalid-zero.png` | Validation works, but warnings are easy to miss in dense UI. |
| Refraction | None/standard/custom | PASS | `design-review/full-audit/refraction-custom-valid.png` | Refraction controls work when location editor is open. |
| Timeline | Hover/click | PASS | `design-review/full-audit/timeline-click-focus.png` | Focus changes. |
| Chart | Hover/click/no -18 deg | PASS | `design-review/full-audit/chart-focus.png` | Thresholds visible. |
| Compass | Sun/Moon/below horizon | PASS | `design-review/full-audit/compass-moon-visible.png` | Markers render. |
| Moon impact | Low/medium/no data | PASS with issue | `design-review/full-audit/moon-impact-medium.png` | Target-angle limitation is present but could be more prominent. |
| Multi-night | 3/7/14/30 | PASS with density issue | `design-review/full-audit/multi-30.png` | 30-night list is usable but visually heavy. |
| Details | Accordions | PASS with console warnings | `design-review/full-audit/detail-event-log.png` | Duplicate React key warnings logged for missing events. |
| Data grid | All/Sun/Moon/filter/search | PASS with issue | `design-review/full-audit/grid-all.png` | Filtering works; sorting controls are missing. |
| Export | CSV/XLSX/TXT/Markdown | PASS with product conflict | `design-review/full-audit/export-panel.png` | All files download; CSV is still active in current UI. |
| Responsive | Desktop/large/tablet/mobile | PASS with issue | `design-review/full-audit/responsive-mobile-top.png` | No global crash; mobile is cramped and very long. |
| Keyboard | Focus control/timeline/grid | PASS with issue | `design-review/full-audit/keyboard-focus-grid.png` | Basic focus works; hidden radio filters were hard to click via pointer in Playwright. |

## Runtime Observations

- Console errors/warnings captured: 15
- Page errors captured: 0
- Request failures captured: 0
- Notes captured: 9
- Repeated React warning: duplicate child keys such as `sun-rise-null`, `sun-set-null`, and `moon-set-null`.
- Geocoding notes: Berlin, London, 94333, and the nonsense query all produced `Location search failed: network error.`
- Export notes:
  - `solar-lunar-positions.csv`, 39172 bytes
  - `solar-lunar-positions.xlsx`, 38477 bytes
  - `solar-lunar-positions.txt`, 61841 bytes
  - `solar-lunar-positions.md`, 47765 bytes

## Findings

### QA-001: Browser geocoding fails with generic network error

Severity: HIGH

Steps:
1. Open the location editor.
2. Select search/place postal code.
3. Search Berlin, 94333, London, or `asdfasdfasdf`.

Expected:
Online searches should show Open-Meteo results or an actionable diagnostic. For network failures, the UI should show the request URL, browser error name/message, timeout distinction, and an API-test link. For Geiselhoering/94333, a local fallback should appear if online geocoding fails.

Actual:
Every tested browser search produced `Location search failed: network error.` No technical detail, request URL, API-test link, or local fallback result is shown.

Screenshot:
`design-review/full-audit/geocoding-plz.png`

Affected files:
`src/lib/geocoding/openMeteo.ts`, `src/app/App.tsx`, `src/components/dashboard/ControlPanel.tsx`

### QA-002: Moon-only target produces rows but breaks night analysis state

Severity: HIGH

Steps:
1. Select target body `Moon`.
2. Analyze the default night.

Expected:
Moon rows should be shown, and night analysis should still compute solar darkness using internal Sun samples, or the UI should clearly explain that night analysis requires Sun data.

Actual:
The result grid contains Moon rows, but the hero/night analysis says `No results yet.` This looks like a failed calculation even though data exists.

Screenshot:
`design-review/full-audit/target-moon.png`

Affected files:
`src/app/App.tsx`, `src/components/AstroDashboard.tsx`, `src/domain/insights/effectiveImagingWindow.ts`

### QA-003: Single instant mode has no clear visible time input

Severity: HIGH

Steps:
1. Select `Single instant`.
2. Inspect the control panel.

Expected:
The mode should expose date and time controls for the exact instant being calculated, and the primary action should not imply a full night unless it still analyzes context intentionally.

Actual:
Only the date is visible in the main control panel; no explicit time field is visible. The primary action still says `Analyze Night`, which conflicts with the single-instant mode.

Screenshot:
`design-review/full-audit/mode-single-time.png`

Affected files:
`src/components/dashboard/ControlPanel.tsx`, `src/app/App.tsx`

### QA-004: Imaging mode changes do not reset the focused sample

Severity: HIGH

Steps:
1. Analyze a night.
2. Switch imaging mode from strict to balanced to bright.
3. Compare hero, effective window, timeline focus, compass, and chart.

Expected:
When the effective window changes, the focused UTC sample should move to the new recommended start or the UI should show that derived views need recalculation.

Actual:
The insight is recomputed from `imagingMode`, but `focusedUtc` is only reset during calculation. Chart/compass focus can remain on a stale sample from the previous mode.

Screenshot:
`design-review/full-audit/imaging-balanced.png`

Affected files:
`src/app/App.tsx`, `src/components/dashboard/TerminalNightTimeline.tsx`, `src/components/dashboard/RadarSkyCompass.tsx`

### QA-005: Data grid has no sorting controls

Severity: HIGH

Steps:
1. Analyze a night.
2. Inspect the data grid.
3. Try to sort by UTC, body, azimuth, or altitude.

Expected:
The grid should offer sorting controls or clickable sortable headers for the requested audit scenarios.

Actual:
The grid has body filters and text search, but no visible sort controls. `grid-sort-altitude.png` is therefore only a captured state, not a verified sort state.

Screenshot:
`design-review/full-audit/grid-sort-altitude.png`

Affected files:
`src/components/dashboard/ResultDataGrid.tsx`

### QA-006: Duplicate React keys are logged for missing event rows

Severity: MEDIUM

Steps:
1. Audit summer, high-latitude, or missing-event nights.
2. Inspect browser console log.

Expected:
Missing rise/set events should render without React key warnings.

Actual:
React logs repeated duplicate-key warnings for keys such as `sun-rise-null`, `sun-set-null`, and `moon-set-null`.

Screenshot:
`design-review/full-audit/detail-event-log.png`

Affected files:
`src/components/dashboard/DetailReport.tsx`, event creation in `src/app/App.tsx`

### QA-007: Geolocation error states are too coarse

Severity: MEDIUM

Steps:
1. Mock geolocation denied.
2. Mock geolocation unavailable.

Expected:
Denied, unavailable, timeout, and unsupported states should be distinguishable.

Actual:
The UI survives both states, but the messaging is not diagnostic enough for a user to know whether permission, browser capability, or position availability failed.

Screenshot:
`design-review/full-audit/gps-unavailable.png`

Affected files:
`src/app/App.tsx`, `src/components/dashboard/ControlPanel.tsx`

### QA-008: CSV is still active in the current UI

Severity: MEDIUM

Steps:
1. Analyze a night.
2. Inspect the export panel.

Expected:
If the current product requirement is still "CSV removed", the UI should show only XLSX, TXT, and Markdown.

Actual:
CSV is visible and downloads successfully. This conflicts with earlier product requirements, although the current audit prompt also asked to test CSV.

Screenshot:
`design-review/full-audit/export-panel.png`

Affected files:
`src/components/dashboard/ExportPanel.tsx`, `src/components/dashboard/ResultDataGrid.tsx`, `src/app/App.tsx`

### QA-009: Mobile layout is functional but excessively dense

Severity: MEDIUM

Steps:
1. Open mobile viewport 390 x 844.
2. Scroll the full page.

Expected:
Core controls, summary, timeline, chart, compass, diagnostics, details, and grid should remain understandable with reasonable scrolling depth.

Actual:
The page is usable but very tall and visually dense. The terminal aesthetic compresses many panels into a narrow column, making the user journey hard to follow.

Screenshot:
`design-review/full-audit/responsive-mobile-top.png`

Affected files:
`src/styles.css`, `src/components/dashboard/ControlPanel.tsx`, `src/components/AstroDashboard.tsx`

### QA-010: CRT effect reduces readability for data-heavy screens

Severity: MEDIUM

Steps:
1. Compare CRT FX ON and OFF.
2. Inspect result grid and detail report.

Expected:
The visual effect should not meaningfully harm dense numerical reading.

Actual:
CRT FX ON is attractive but makes small text, grid cells, and long tables harder to read. OFF improves readability.

Screenshot:
`design-review/full-audit/crt-on.png`

Affected files:
`src/components/retro/CrtScreen.tsx`, `src/styles.css`

### QA-011: Refraction controls are hidden inside location editing

Severity: LOW

Steps:
1. Inspect the default control panel.
2. Open location editor/manual coordinates.

Expected:
Refraction settings should be discoverable near astronomy/calculation settings.

Actual:
Refraction is only visible after opening the location editor and manual tab. That placement is not obvious for users validating astronomy assumptions.

Screenshot:
`design-review/full-audit/refraction-standard.png`

Affected files:
`src/components/dashboard/ControlPanel.tsx`

### QA-012: Full screenshot artifact set is large

Severity: LOW

Steps:
1. Run `npm run audit:site`.
2. Inspect `design-review/full-audit/`.

Expected:
Artifacts should be useful and small enough for GitHub review.

Actual:
The required complete audit screenshot set is about 141.84 MB. No single file is large, but the set adds noticeable repository weight.

Screenshot:
`design-review/full-audit/multi-30.png`

Affected files:
`tests/e2e/full-site-audit.spec.ts`, `design-review/full-audit/`

## Required Fixes

1. Repair browser geocoding diagnostics and fallback handling before further layout work.
2. Make Moon-only mode compute hidden Sun samples for night analysis, or clearly disable/explain night analysis when only Moon rows are requested.
3. Add explicit time input and mode-appropriate labels/actions for single-instant mode.
4. Synchronize focused sample when imaging mode changes.
5. Add real data-grid sorting controls or sortable headers.
6. Fix duplicate React keys for missing events.
7. Improve GPS error specificity.
8. Decide whether CSV remains in scope. If not, remove CSV UI/export/tests.
9. Reduce mobile density after the functional state bugs are fixed.
10. Consider a smaller committed screenshot strategy for future audits, such as curated critical screenshots plus CI artifacts.

## Verification Commands

The following command has been run successfully before writing this report:

```text
npm run audit:site
```

Result:

```text
10 passed
```

The final required command sequence was run after this file was created:

```text
npm ci
npm run build
npm test
npm run screenshot:design
npm run test:e2e
```

Results:

```text
npm ci: PASS, 222 packages installed, 0 vulnerabilities.
npm run build: PASS. Vite reported a non-fatal large chunk warning.
npm test: PASS, 15 test files, 44 tests.
npm run screenshot:design: PASS, 1 Playwright test.
npm run test:e2e: PASS, 12 Playwright tests.
```

Note: The first attempt to remove `node_modules` failed because a Rolldown native binding was still locked by leftover Vite/Node processes from previous Playwright webserver runs. Those workspace-specific `node.exe` processes were stopped, `node_modules` was removed, and `npm ci` then completed successfully.

## Recommended Follow-Up Prompt

```text
Bitte behebe gezielt die Audit-Befunde aus QA_AUDIT.md in dieser Reihenfolge:
1. Open-Meteo-Ortssuche mit Diagnose, Timeout, API-Test-Link und lokalem Geiselhoering/94333-Fallback reparieren.
2. Moon-only Nachtanalyse korrigieren, indem Sonnenhoehen intern weiter berechnet werden.
3. Single-Instant-Modus mit sichtbarem Uhrzeitfeld und passender Aktion korrigieren.
4. Imaging-Mode-Wechsel mit Fokuszeit, Timeline, Chart und Kompass synchronisieren.
5. Data-Grid-Sortierung implementieren.
6. React-Key-Warnungen in DetailReport/Eventdaten beheben.
Danach Tests, Build und die relevanten E2E-Screenshots erneut ausfuehren. Kein NREL-SPA-Code, keine erfundenen JPL-Werte.
```
