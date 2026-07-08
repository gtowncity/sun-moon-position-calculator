# DSO Planner

The DSO Planner extends the local Sun/Moon position tool with a browser-only deep-sky planning workflow. It evaluates Messier targets against Sun altitude, Moon altitude/illumination/distance, and target altitude for every sampled interval of every selected astro-night.

No weather is included. The planner does not call cloud, seeing, transparency, wind, dew point or forecast APIs. The score is an astronomical planning score, not a guarantee of image quality.

## What It Calculates

- Local and UTC interval time.
- Sun altitude, azimuth, twilight class and sun score.
- Moon altitude, azimuth, illumination, target separation, moon state and moon score.
- Messier target altitude, azimuth, approximate airmass, hour angle, culmination and max altitude.
- Final DSO score from 0 to 100.
- MAIN, EXTRA, TEST and BAD categories.
- Effective integration weight and effective duration.
- Per-night windows and summaries.
- Optional target-effective-hours plan that picks the best windows until the requested effective time is reached.

Astro-night labels use the start and next date, for example `2026-08-14 -> 2026-08-15`.

## Messier Catalog

All Messier objects M1 to M110 are stored locally in `src/dso/catalog/messierCatalog.ts`. M102 is included as NGC 5866 and carries the ambiguity note:

`Historically ambiguous / spurious Messier object; commonly associated with NGC 5866.`

The catalog includes object id, Messier number, names, aliases, J2000 RA/Dec, constellation, normalized object type, magnitude/size where available, data quality and a planning profile. The base tabular coordinates and object facts were normalized from a structured Messier catalog table by AstroPixels: https://astropixels.com/messier/messiercat.html

## Why Objects Differ

The planner does not treat all galaxies or all nebulae as identical. It combines:

- Defaults by normalized object type.
- Object-specific overrides for important Messier targets.
- Size, brightness and surface-brightness-derived difficulty.

Examples:

- M13 is a bright globular cluster, so moon penalties are reduced and altitude matters more.
- M101 is a weak face-on galaxy, so moonlight, twilight, low altitude and gradients are heavily penalized.
- M31 is bright and tolerant for core data, but the halo and outer structure remain gradient-sensitive.
- M81 is stricter than M31 because the useful outer detail is less forgiving.
- M45 is a reflection-nebula target and is very sensitive to moonlight and gradients.
- M42 is bright and twilight-tolerant, but carries a high core-saturation warning.

## Score Model

Each interval produces three main scores:

- `sunScore`: derived from Sun altitude, with astronomical night near 100 and twilight falling off quickly.
- `moonScore`: derived from Moon illumination, Moon altitude, Moon-target angular distance and object sensitivity.
- `targetAltitudeScore`: derived from target altitude and the object planning profile.

The final score uses a weighted geometric/soft-minimum blend so one bad factor can strongly reduce the result. Small modifiers account for object difficulty, Bortle/SQM and setup profile. Broadband DSLR setups remain conservative around Moon and twilight.

Default category thresholds:

- MAIN: score >= 80.
- EXTRA: score >= 60 and < 80.
- TEST: score >= 40 and < 60.
- BAD: score < 40.

Hard guards can cap a category. Examples:

- Target below the object MAIN altitude cannot be MAIN.
- Target below usable altitude is capped at TEST.
- Bright/near Moon for a sensitive object can cap the interval at EXTRA or TEST.
- Weak broadband targets in bright twilight cannot become MAIN.

## Effective Integration

Effective time is not the same as clock time. Each interval receives a continuous effective weight:

- High-score MAIN intervals are close to 1.0.
- EXTRA intervals usually count around 0.50 to 0.80.
- TEST intervals count only lightly.
- BAD intervals count as 0.

The target-hours mode sorts MAIN and EXTRA windows first, then considers target altitude, Moon conditions, darkness and window length. It stops when the requested effective time is reached or reports the remaining effective time.

## Setup Profiles

The default preset is:

`Evostar 72ED + Nikon D5300 + Guiding`

When sensor and focal length are known, the UI displays field of view and pixel scale. Missing setup details do not block planning; the fallback is a generic broadband DSLR profile.

## Accuracy Limits

The DSO target position uses J2000 RA/Dec with a standard sidereal-time RA/Dec to Alt/Az conversion. This is appropriate for planning windows and altitude trends, but it is not a replacement for precise astrometric solving, refraction modeling, plate solving or mount pointing correction.

Approximate airmass uses `1 / sin(altitude)`. It is a planning approximation and becomes less reliable near the horizon.

## What The Score Does Not Know

The planner does not evaluate:

- Clouds.
- Transparency.
- Seeing.
- Wind.
- Dew.
- Focus.
- Guiding performance.
- Tracking errors.
- Local obstructions.
- Real subframe quality.

Planning should be followed by real frame inspection and rejection after capture.
