# LIMITATIONS.md

- Atmospheric refraction depends on real pressure, temperature, humidity and local weather. Standard/custom modes are approximations.
- The local horizon is not modeled. Buildings, mountains, trees and terrain can hide a body even when the mathematical altitude is positive.
- High numerical precision does not guarantee real-world visibility.
- Geocoding can be ambiguous, especially for postal codes and repeated place names. Users must select a result.
- Polar regions can have dates with no sunrise, no sunset, no moonrise or no moonset.
- Time-zone rules can change historically and politically. The app depends on the runtime IANA time-zone data available to the browser/polyfill.
- JPL Horizons is used as a validation reference source, not as a runtime dependency.
- The current solar runtime is not a redistributed NREL-SPA implementation. See `ACCURACY.md`.
- Moon rise/set can be harder to validate to sub-minute accuracy because lunar motion is fast and horizon/refraction assumptions matter.
