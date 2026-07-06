# ACCURACY.md

## Accuracy Goals

The project targets the following validation goals after real external reference fixtures have been added:

- Sun azimuth: below 0.01 degrees against NREL-SPA/JPL-compatible reference cases.
- Sun altitude/elevation: below 0.01 degrees against NREL-SPA/JPL-compatible reference cases.
- Moon azimuth: preferably below 0.1 degrees against JPL Horizons.
- Moon altitude/elevation: preferably below 0.1 degrees against JPL Horizons.
- Sun rise/set: preferably below 1 minute against reference cases.
- Moon rise/set: preferably below 1-2 minutes, documented per fixture.

These are validation goals, not unconditional promises for all inputs and atmospheric states.

## Current Runtime Method

The current runtime uses `astronomy-engine` for both Sun and Moon positions. For each body the app obtains topocentric equatorial coordinates for the observer and converts them to horizontal coordinates.

The Moon calculation is topocentric and therefore accounts for lunar parallax. A geocentric Moon position alone is not used for the UI result table.

## Solar Method and NREL SPA

NREL SPA is the documented target reference procedure for solar-position validation. The official NREL SPA source code is not copied into this project because its redistribution and use terms are restrictive. The current implementation therefore does not claim to be an NREL SPA port and does not claim proven 0.01-degree solar accuracy.

To make the 0.01-degree claim, the project needs one of these:

- a cleanly licensed, reviewed SPA-compatible TypeScript implementation, or
- a carefully implemented SPA derivation with licensing review and reference tests, or
- acceptance that `astronomy-engine` is the runtime method with separately documented tolerances.

## Lunar Method

The Moon uses `astronomy-engine` as the primary runtime method. Validation is intended against JPL Horizons topocentric apparent coordinates. Special care is needed near the horizon because refraction and local horizon conditions can dominate small numerical differences.

## Reference Sources

- JPL Horizons: intended source for topocentric Sun/Moon fixture values.
- NREL SPA: intended solar reference procedure.
- NOAA solar calculator: acceptable only as a plausibility comparison, not as the primary accuracy reference.

## Refraction Limits

Refraction is weather-dependent. The app supports:

- none: geometric altitude only;
- standard: Astronomy Engine normal refraction;
- custom: pressure/temperature-scaled Bennett-style correction.

The correction is least reliable very close to the horizon and below the horizon. Results near apparent/geometric altitude 0 degrees are flagged because real pressure, temperature, humidity, local terrain and horizon obstructions can change visibility.

## Rise/Set Definitions

Rise/set events use the runtime library's body-aware search. The definition includes standard atmospheric density and body-specific treatment supplied by `astronomy-engine`. The app reports if no rise or no set is found inside the selected local date window.

Transit means the upper meridian passage searched by hour angle 0 within the local date window.

## Effective Imaging Window Precision

The Astro night planner does not introduce a new simplified solar-position formula. It uses the already computed topocentric Sun rows and classifies them by geometric solar altitude.

Twilight milestones and effective imaging windows are interpolated between adjacent interval samples. With the default one-night mode using 10-minute samples, these planning boundaries are suitable for dashboard guidance but are not a replacement for independently validated event fixtures. Smaller intervals improve boundary precision.

## Known Deviations

Real JPL/NREL fixtures are not yet committed. JSON fixture files currently contain `TODO_REFERENCE_VALUE` placeholders and are not treated as passing astronomical reference tests.

## UI Presentation Limits

The amber CRT dashboard is a planning interface. Large labels such as `[GOOD]`, `[LIMITED]` and `[NO ASTRO NIGHT]` summarize the selected samples; they are not claims of NREL-SPA accuracy or JPL-identical output.

The oscilloscope chart, radar compass, Moon interference report and quality diagnostics are derived from the same runtime result rows shown in the data grid. They do not account for terrain, buildings, mountains, clouds, haze, seeing, local light pollution or target-specific Moon separation.
