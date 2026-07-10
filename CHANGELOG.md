# CHANGELOG.md

## 2026-07-10

### Added

- Added a multi-object DSO Session Planner layer on top of the existing single-object DSO calculation pipeline.
- Added session targets with per-object effective-hour goals, priority, active state and primary-target selection.
- Added exposure allocation modes: equal distribution, manual per object and priority-based allocation.
- Added complete local DSO location profiles with name, coordinates, elevation, IANA timezone, Bortle, SQM, default flag and explicit save/load/delete controls.
- Added separated calendar state for quality, data category, selection and total inclusion.
- Added calendar interaction: click for detail focus, checkbox-style total toggle, desktop context menu and mobile menu control.
- Added an explanatory German quality-profile panel and contextual German warning box.
- Added a clearer Belichtungsziel summary with total and per-object progress.
- Added a simple FOV / Bildfeld preview for one or more session targets.
- Added DSO session unit tests and Playwright DSO UX screenshots under `artifacts/dso-ux-screenshots/`.

### Changed

- Reworked the DSO planner UI from a single-object technical view into a broader session-planning surface.
- Kept raw interval data collapsed by default under `Rechenweg / Rohdaten`.
- Updated `build:pages` to preserve existing auxiliary pages while rebuilding `site/`.
- Added a visible root fallback in `index.html` so GitHub Pages no longer appears as a blank white page if redirect or script loading is delayed.

### Fixed

- Fixed the calendar status model where quality could visually overwrite selection or total-inclusion state.
- Fixed mobile layout overlap by keeping the calculate action in normal flow.
- Kept `site/prototype-win98/index.html` and `site/sun-moon-export.html` during the Pages build.

## 2026-07-06

### Changed

- Rebuilt the information architecture around a Win95-inspired amber CRT terminal application frame.
- Replaced the scattered card layout with:
  - Terminal topbar, menu and statusbar
  - Compact control panel
  - Main astro night analysis
  - Large night timeline
  - Twilight phase table
  - Instrument cluster
  - Multi-night database
  - Collapsible detail report
  - Retro result data grid with attached exports
- Moved exports to the result data grid.
- Reworked CSS into a single amber CRT design system with bevels, monospace typography, scanlines, glow and a CRT FX toggle.
- Added reusable retro components and split dashboard sections into dedicated files.
- Added terminal-style quality diagnostics.
- Updated Playwright design screenshots to write final review artifacts.

### Fixed

- Removed the layout expansion bug where the control panel could become thousands of pixels wide due grid min-content sizing.
- Removed old broad layout hacks in favor of targeted grid classes.

### Notes

- CSV, XLSX, TXT and Markdown exports remain available.
- No NREL-SPA code was copied or ported.
- No JPL-Horizons values were invented.

## 2026-07-05

### Added

- Added an Astro night analysis mode for one selected night from evening date to following morning.
- Added effective imaging-window logic based on solar altitude thresholds:
  - strict DSO: Sun <= -18 deg
  - balanced DSO: Sun <= -15 deg
  - bright targets/test: Sun <= -12 deg
- Added twilight milestone calculation for sunset, -6 deg, -12 deg, -18 deg, dawn transitions and sunrise.
- Added multi-night summaries with effective window, astronomical-night duration and Moon illumination.
- Added unit tests for solar altitude classification, twilight phases, night summaries and multi-night grouping.
- Added Playwright design screenshots for redesign and final review rounds.

### Changed

- Redesigned the dashboard into a wider Astro planning surface with a concrete night hero, large timeline, improved altitude chart, larger compass and richer multi-night planner.
- Moved raw scores below the primary planning modules.
- Updated the screenshot script to capture final desktop, mobile, night-mode and 7-day planner states.

### Notes

- The runtime still uses the existing astronomy calculation pipeline. The new night planner classifies and summarizes those computed positions; it does not introduce a simplified astronomy formula.
- Effective twilight boundaries are interpolated from sampled interval rows, so precision depends on interval size.
