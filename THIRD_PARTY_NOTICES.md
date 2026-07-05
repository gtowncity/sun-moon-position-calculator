# Third-Party Notices

This project uses third-party libraries and services. This file is informational and is not legal advice.

## Runtime Libraries

- Astronomy Engine: MIT license, used for Sun and Moon calculations.
- `@js-temporal/polyfill`: ISC license, used for IANA time-zone and DST handling.
- ExcelJS: MIT license, used for real `.xlsx` workbook export.
- React and React DOM: MIT license, used for the web UI.
- Lucide React: ISC license, used for icons.

## Third-Party API

Open-Meteo Geocoding is used for place and postal-code search. The free API is described by Open-Meteo as non-commercial and rate-limited. The app sends the user's search query to Open-Meteo only when the user starts a search.

## Private Local Asset

`src/assets/twilight-diagram.png` was provided by the user for private local use in XLSX exports and is ignored by git on purpose. The image may be protected by copyright. Do not redistribute it in a public GitHub repository or public package without clearing the necessary rights.
