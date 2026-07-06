# DESIGN_PLAN.md

## Current Audit

Baseline screenshots were captured before application code changes in:

```text
design-review/baseline-current/
  desktop-full.png
  desktop-above-fold.png
  mobile-full.png
```

The current application is a working astronomy calculator, but its information architecture still reads as a collection of equal-weight dashboard cards. The visual theme is a modern dark astro dashboard, not a Win95 amber CRT terminal. A color-only restyle would not fix the deeper problem: users must scan separate areas to understand which night is being analyzed, when the useful imaging window starts, why it is useful, what the Moon does, and where the raw rows/export controls live.

## Existing Components

- `src/app/App.tsx`: owns nearly all UI state, calculation flow, location/geocoding, saved locations, export handlers and much of the rendered form.
- `src/components/AstroDashboard.tsx`: contains hero, range selector, night summary cards, timeline, altitude chart, compass, Moon card, event cards, score cards and multi-night planner in one file.
- `src/components/ResultTable.tsx`: raw result table.
- `src/domain/insights/effectiveImagingWindow.ts`: core night summary, twilight segmentation and effective imaging window logic.
- `src/domain/insights/moonInterference.ts`: Moon interference score helper.
- `src/lib/astronomy/`, `src/lib/time/`, `src/lib/location/`, `src/lib/geocoding/`, `src/lib/export/`: calculation, time, location and export infrastructure.
- `src/i18n/de.json` and `src/i18n/en.json`: active localization files.
- `src/styles.css`: modern dashboard styling with multiple appended override blocks.

## Structural Problems

- Inputs and results are mixed: the analysis mode sits above the dashboard, location/time/body/range/options follow below it, and export actions sit between controls and result summaries.
- Too many modules have equal visual weight: hero, night summary cards, charts, compass, events, scores, heatmap and raw summaries all compete.
- The hero is visually large but not structured as the main terminal readout. It does not clearly own the full "night span -> effective window -> usable time -> status" story.
- The timeline is present but still behaves like a row of samples rather than the main planning instrument.
- The compass is useful but visually reads as a generic card, not an instrument.
- Moon interference and quality scores are separate small blocks instead of a terminal diagnostic report.
- Event cards should become an event log, sorted and subordinate to the primary timeline.
- Multi-night planning is displayed as cards; comparison is harder than in a database/table view.
- Result rows are a data table, but not framed as a deliberate retro data grid with nearby export controls.
- Location controls take permanent vertical space even when a location is already selected.
- CSS contains broad layout hacks such as global `nth-child` placement and repeated override sections, making the layout fragile.
- Large desktop widths stretch the dashboard without a strong application frame; mobile stacks but remains dense.

## New Information Architecture

The application will be restructured as:

```text
APP FRAME
├─ Terminal Topbar
├─ Terminal Statusbar
├─ Compact Control Panel
├─ Main Astro Night Analysis
│  ├─ Terminal Hero
│  ├─ Effective Imaging Window
│  ├─ Large Night Timeline
│  └─ Twilight Phase Table
├─ Instrument Cluster
│  ├─ Oscilloscope Altitude Chart
│  ├─ Radar Sky Compass
│  └─ Moon Interference Report
├─ Multi-Night Planner
├─ Detail Report
│  ├─ Event Log
│  ├─ Sun Details
│  ├─ Moon Details
│  ├─ Solar Phases
│  └─ Lunar Events
└─ Result Data Grid + Export
```

## App Frame

The page becomes an application shell, not a normal website header. The topbar shows `SUN/MOON ASTRO TERMINAL v0.9`, a Win95-style menu row and language/CRT controls. The statusbar shows readiness, selected location, timezone, mode, selected night, row count and CRT FX state.

## Compact Control Panel

The control panel moves directly below the statusbar and becomes compact:

- mode tabs: Single Time, One Night, Multi Night, Custom Range;
- night date with automatic start-date to following-date display for One Night;
- compact location display with `Change` and `GPS`;
- timezone;
- Sun/Moon/Both target;
- imaging mode: strict -18 deg, normal -15 deg, bright -12 deg;
- interval;
- primary `Analyze Night` action.

The detailed location editor is only shown when changing location. Export buttons move out of the control panel and into the result data grid.

## Main Analysis

The hero becomes the dominant readout:

- concrete night span;
- selected imaging mode;
- effective imaging window as the largest time value;
- usable time;
- true astronomical night;
- status in brackets such as `[GOOD]`, `[LIMITED]`, `[NO ASTRO NIGHT]`.

The twilight phase table sits directly below the hero and is sorted evening to night to morning. It uses the documented geometric solar-altitude thresholds: 0, -6, -12 and -18 degrees.

## Instrument Cluster

The instrument cluster follows the main analysis:

- the altitude chart becomes an amber oscilloscope with Sun/Moon curves, horizon and twilight thresholds;
- the sky compass becomes a radar scope with N/E/S/W or N/O/S/W labels depending on language;
- Moon interference becomes a terminal diagnostic block with illumination, altitude, status, impact, target-angle note and plain-language note.

## Multi-Night Planner

Multi-night output becomes a terminal database view with rows for each night. The user can compare night quality, astronomical time, Moon impact and best window, then click a row to load that night.

## Detail Report

Secondary details are moved into an accordion-style report:

- event log;
- current Sun position;
- current Moon position;
- solar phases;
- lunar events;
- raw calculation notes.

Details are subordinate to the main night analysis and no longer appear as a scattered card stack.

## Result Data Grid

Raw result rows remain available but are intentionally framed as a retro data grid at the bottom. The export controls are attached to the data grid:

```text
[EXPORT RESULT DATA]
[CSV] [XLSX] [TXT] [MARKDOWN]
```

CSV remains available in this task because the current acceptance criteria require no export-function regressions.

## Win95 Amber CRT Design System

The visual system will use CSS custom properties for:

- near-black CRT background;
- amber foreground, bright amber highlights and muted amber labels;
- bevel borders with light top/left and dark bottom/right edges;
- monospace typography;
- scanlines, vignette and subtle glow;
- an accessible CRT FX toggle that respects `prefers-reduced-motion`.

Status is never conveyed only by color; labels use bracketed terminal language.

## Components To Create

Retro base components:

- `CrtScreen`
- `RetroWindow`
- `RetroTitleBar`
- `RetroPanel`
- `RetroButton`
- `RetroInput`
- `RetroSelect`
- `RetroTabs`
- `RetroStatusBar`
- `RetroFieldset`
- `RetroDataGrid`
- `RetroAccordion`

Dashboard components:

- `TerminalAppFrame`
- `ControlPanel`
- `TerminalHero`
- `EffectiveImagingWindowDisplay`
- `TerminalNightTimeline`
- `TwilightPhaseTable`
- `OscilloscopeAltitudeChart`
- `RadarSkyCompass`
- `MoonInterferenceReport`
- `QualityDiagnostics`
- `EventLog`
- `RetroMultiNightPlanner`
- `DetailReport`
- `ResultDataGrid`
- `ExportPanel`

## Domain Work

Existing effective-window logic remains the basis. The redesign adds or clarifies:

- `calculateEffectiveImagingWindow()`
- `calculateSolarTwilightPhases()`
- `classifySolarAltitudeForImaging()`
- `calculateNightSummary()`
- `calculateMultiNightPlan()`
- `calculateMoonInterference()`
- `calculateQualityDiagnostics()`

The score logic is UI guidance, not a scientific measurement. No NREL-SPA code is copied or ported, and no JPL-Horizons reference values are invented.

## Screenshot Review Process

The screenshot script will produce:

```text
design-review/
  restructure-round-01/
  amber-crt-round-02/
  final/
```

with desktop, above-fold, mobile, one-night and multi-night states. `DESIGN_REVIEW.md` will record concrete critique and action, including at least one improvement round.

## Acceptance Focus

The finished UI must make the practical astronomy answer immediately visible:

- Which night is analyzed?
- When does the effective imaging window start and end?
- How much usable time exists?
- Is there true astronomical night?
- What does the Moon do?
- Which details are optional?
- Where are raw rows and exports?

The calculations and accuracy stance stay conservative: Astronomy Engine remains the browser runtime, JPL Horizons is a validation reference, NREL-SPA code is not used, local horizon/weather/seeing are not included.
