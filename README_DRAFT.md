# Sun Moon Position Calculator

Draft README. This is not the final user-facing README yet.

## Purpose

Sun Moon Position Calculator is planned as a browser-based web tool for calculating topocentric Sun and Moon positions for user-selected times and locations.

The core priority is correctness and honest documentation. The tool should be useful for planning, education and data export, but it must not pretend to be more accurate than its algorithms, inputs and validation support.

## Planned Features

- Calculate Sun position
- Calculate Moon position
- Calculate Sun and Moon together
- Manual latitude/longitude input
- Browser geolocation after explicit user action
- Location search by place name
- Location search by postal code
- IANA time zone dropdown
- Date input via calendar field or manual entry
- Time input
- Interval selection, e.g. 1, 5, 10, 15, 20, 30, 60 minutes
- Time range by start/end or start + duration
- German/English language switch
- Results as table
- Downloads as CSV, XLSX, TXT and Markdown

Optional convenience button:

- "Alle Daten automatisch ermitteln"
- "Detect all data automatically"

This button should set current browser coordinates if permission is granted, browser time zone, current date, current time and possibly browser language. It should not choose the interval automatically.

## Algorithm Strategy

The planned MVP should use Astronomy Engine as the runtime calculation library for both Sun and Moon.

Reasons:

- JavaScript/TypeScript and browser-friendly
- MIT-licensed
- Supports Sun, Moon, horizontal coordinates, observer-based calculations and Moon phase use cases
- Project documentation states an approximate +/- 1 arcminute design goal and validation against sources including JPL Horizons

Sources:

- Astronomy Engine: https://github.com/cosinekitty/astronomy

JPL Horizons should be used as a validation reference, not as a live runtime backend.

Sources:

- Horizons API: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- Horizons Manual: https://ssd.jpl.nasa.gov/horizons/manual.html

NREL SPA is not planned as runtime code. The official NREL SPA code must not be copied, ported or redistributed in this public GitHub project because the official terms restrict the code to internal, non-commercial use and prohibit redistribution.

Source:

- NREL/NLR SPA: https://midcdmz.nlr.gov/spa/

The NREL SPA publication may be used as a scientific reference, but not as a source for copied or ported code.

## Accuracy Statement Draft

Draft wording:

"The calculations are performed in the browser with an astronomy library and are tested against JPL Horizons reference data. Accuracy depends on location, time, time zone handling, refraction assumptions, rounding and the selected algorithm. Atmospheric refraction is approximate. Local horizon effects such as buildings, mountains, trees and weather are not included."

Important:

- Do not claim NREL-SPA precision for the MVP.
- Do not claim JPL-identical values.
- Do not claim better than 0.01 degree unless project tests prove it.
- Moon positions must be topocentric; lunar parallax is relevant.

## Time Zones

The app should use IANA time zones, not naive UTC offsets.

Planned approach:

- Use Temporal via `@js-temporal/polyfill` until native browser support is sufficient.
- Use `Intl.supportedValuesOf("timeZone")` for the time zone dropdown where available.
- Handle daylight saving time gaps and duplicate local times.
- Export both local time and UTC time.

Sources:

- Temporal docs: https://tc39.es/proposal-temporal/docs/
- MDN `Intl.supportedValuesOf`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf

## Location and Geocoding

Browser geolocation:

- Only after a user click
- No automatic request on page load
- Must handle denied permission, unavailable location, timeout and low accuracy
- Requires secure context/HTTPS in browsers

Location and postal-code search:

- Open-Meteo Geocoding is a candidate provider.
- It supports place names and postal codes and can return coordinates, elevation and time zone.
- The provider must be modular so another provider can replace it later.

Open-Meteo caveat:

- The free API is non-commercial and rate-limited according to its terms.
- The UI/README should document third-party API usage and attribution requirements.

Sources:

- Open-Meteo Geocoding: https://open-meteo.com/en/docs/geocoding-api
- Open-Meteo Terms: https://open-meteo.com/en/terms
- MDN Geolocation: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API

## Planned Result Data Model

One row per time and body:

| Column | Meaning |
| --- | --- |
| `localDate` | Date in selected time zone |
| `localTime` | Time in selected time zone |
| `timeZone` | IANA time zone |
| `utcTime` | UTC instant |
| `latitude` | Observer latitude |
| `longitude` | Observer longitude |
| `elevationMeters` | Observer elevation |
| `body` | Sun or Moon |
| `azimuthDeg` | Azimuth in degrees |
| `altitudeDeg` | Unrefracted altitude/elevation in degrees, if available |
| `zenithDeg` | Zenith angle in degrees |
| `apparentAltitudeDeg` | Refracted/apparent altitude, if available |
| `rightAscension` | Right ascension, representation to be finalized |
| `declinationDeg` | Declination in degrees |
| `distanceKm` | Distance/range in kilometers, if available |
| `phaseName` | Moon phase name, for Moon rows |
| `illuminationPercent` | Moon illumination, for Moon rows |

This long-row model is better for export, filtering and future extension than separate wide Sun/Moon columns.

## Planned Exports

CSV:

- UTF-8
- Header row
- Consistent decimal point
- Proper escaping

XLSX:

- Real numeric cells
- Header row
- Useful column widths
- Not a fake HTML table with `.xls` extension

TXT:

- Human-readable text table

Markdown:

- Markdown table with escaped pipes and line breaks

Candidate XLSX libraries:

- SheetJS CE / `xlsx`: Apache-2.0, but install path and bundle size need final review
- ExcelJS: MIT, browser bundle needs review

## Planned Architecture

```text
src/
  app/
  components/
  lib/
    astronomy/
    time/
    location/
    geocoding/
    export/
    validation/
  i18n/
  types/
tests/
docs/
```

Rules:

- No astronomy logic inside UI components.
- No naive UTC-offset time logic.
- No NREL SPA code.
- Validation fixtures must not contain invented values.

## Validation Plan

Reference cases should be generated from JPL Horizons for:

- Berlin
- New York
- Sydney
- Quito or another equator-near location
- Tromsø or another high-latitude location
- UTC-focused case
- Summer time
- Winter time
- DST start/end edge cases
- Equinox
- Solstices
- Moon near full moon
- Moon near new moon
- Moon near horizon

Targets:

- Sun: `10`
- Moon: `301`

Output quantities:

- Azimuth
- Elevation
- Right ascension
- Declination
- Range/distance, if available

TODO:

- Generate actual Horizons reference data.
- Store query URLs and metadata.
- Define final tolerances after first comparisons.

## Development Status

Planning only. No React app, calculation module, UI components, export code or package setup has been created yet.

