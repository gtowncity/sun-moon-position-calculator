# DESIGN_PLAN.md

## Current UI State

The project is currently a working calculation form with result summaries, export buttons and a detailed table. It is useful, but it still behaves mostly like a form-driven calculator:

- users enter location/time settings;
- users click calculate;
- the app shows summary cards, events, solar phases and a table;
- exports are available after calculation.

The existing UI is clear enough for technical validation, but it does not yet feel like an interactive astro-dashboard. The first viewport still leads with controls and technical accuracy text instead of an immediate observing recommendation.

## Existing Components

- `src/app/App.tsx`: all primary UI state, calculation flow and rendering.
- `src/components/ResultTable.tsx`: result table.
- `src/styles.css`: current light control-panel design.
- `src/i18n/de.json` and `src/i18n/en.json`: localized UI strings.
- Astro and export logic under `src/astro/` and `src/lib/`.

## Weaknesses

- No hero insight that answers whether the night is useful.
- No central range selector for today, 3 days, 7 days, 14 days and 30 days.
- No interactive night timeline.
- No altitude chart with hover/focus behavior.
- No sky compass.
- No moon-interference visualization.
- No multi-day observation heatmap.
- Detail table is present but not filterable/sortable in the UI.
- The design is functional but not yet a polished dark astro application.
- Screenshot review artifacts are missing.

## Target Experience

The app should open with an immediate answer:

- best observing window;
- darkness quality;
- moon interference;
- explanation in plain language;
- direct interaction that scrolls or focuses the detailed timeline.

The user should be able to explore:

- change the range preset;
- click a heatmap day to load that night;
- hover or focus timeline/chart points;
- click events to set focus time;
- inspect a compass for the selected time;
- filter detail rows by body.

## Design Principles

- Dark, calm, observational visual language.
- First screen answers practical observing questions before raw numbers.
- Exact data remains available, but it follows the insight layer.
- Every major data module has hover/focus/click behavior.
- No information relies on color alone; labels and text explain states.
- Mobile stacks cards vertically; desktop uses a dashboard grid.

## New Modules

- `NightHero`: concrete selected-night result and effective imaging window.
- `NightSummaryCards`: sunset, twilight thresholds, sunrise and duration cards.
- `RangeSelector`: Today, 3 days, 7 days, 14 days, 30 days, Custom.
- `NightTimeline`: clickable/hoverable horizontal timeline with twilight phase coloring.
- `AltitudeChart`: SVG altitude curve for Sun and Moon with 0, -6, -12 and -18 degree reference lines.
- `SkyCompass`: true-north compass for selected focus time.
- `MoonInterferenceCard`: visual Moon disturbance scale.
- `ScoreCard`: interactive explanation cards.
- `EventCards`: clickable event list.
- `MultiNightPlanner`: multi-night cards with effective window, astronomical-night duration and mini timelines.
- `ExportPanel`: grouped export controls.

## Interaction Concept

- Hovering a timeline or chart point displays a local/UTC time and Sun/Moon values.
- Clicking timeline/chart/event points sets the focused result row.
- Clicking a heatmap day updates the detail date and recalculates.
- Changing the range preset recalculates overview data.
- Score cards expose calculation details using buttons/details sections.
- Table filters update immediately without recomputing astronomical values.

## Screenshot Review Process

Screenshots are stored in:

```text
design-review/
  round-02-redesign/
  round-03-final/
```

Each round should capture:

- desktop dashboard;
- mobile dashboard;
- an interacted state with focused timeline/chart data.

Review criteria:

- clarity of immediate answer;
- visual hierarchy;
- beauty and calmness;
- interactivity;
- data clarity;
- mobile ergonomics.

## Implementation Order

1. Add dashboard insight helpers derived from calculated rows/events.
2. Add the new interactive dashboard components inside the existing React app.
3. Replace the light layout with a dark astro design system.
4. Add i18n keys for the new modules.
5. Add tests for insight helpers and table filtering.
6. Add a screenshot script and generate review artifacts.
7. Update `DESIGN_REVIEW.md`, `README.md` and `CHANGELOG.md`.

## Notes

This design layer does not change the documented astronomy accuracy stance. It transforms validated calculation output into practical observing guidance while preserving exports and raw detail data.

## Completion Note

The redesign now centers the app on an Astro night workflow. "One night" analyzes the selected evening date into the following morning, classifies solar altitude thresholds, and presents effective imaging time before raw tabular data. The remaining known design limitation is that the dashboard is data-dense on small mobile screens because all core controls remain available.
