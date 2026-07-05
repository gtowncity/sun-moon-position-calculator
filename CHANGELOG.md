# CHANGELOG.md

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
