# DESIGN_REVIEW.md

## Round 02 Redesign

Screenshots:

- `design-review/round-02-redesign/desktop-full.png`
- `design-review/round-02-redesign/desktop-above-fold.png`
- `design-review/round-02-redesign/mobile-full.png`

Findings:

- The app now uses the desktop width much better than the previous narrow prototype.
- The first viewport clearly states the selected night and whether an effective imaging window exists.
- The "Night analysis" panel makes sunset, twilight boundaries and sunrise visible without reading the raw table.
- Weakness found during review: the hero originally left unused space under the left column because the night summary was taller. The final CSS pass makes the hero fill that row.
- Weakness found during review: score cards were too prominent above the timeline. They were moved behind the main night-planning modules.

## Round 03 Final

Screenshots:

- `design-review/round-03-final/desktop-full.png`
- `design-review/round-03-final/desktop-above-fold.png`
- `design-review/round-03-final/mobile-full.png`
- `design-review/round-03-final/night-mode-2026-07-05.png`
- `design-review/round-03-final/multiday-7-days.png`

Review:

1. Professional appearance: improved. The app reads as an astro planning dashboard instead of a raw calculator.
2. Effective imaging time: improved. The hero shows the effective window or an explicit "no effective imaging window" state.
3. Night identity: improved. The UI shows the night from the selected date to the following date.
4. Astronomical night: improved. The night analysis panel exposes the -18 deg phase and its duration.
5. Timeline size: improved. The timeline is a large interactive planning element with twilight phase coloring.
6. Charts: improved. The altitude chart includes 0, -6, -12 and -18 deg reference lines and an effective-window band when available.
7. Compass: improved. The compass is larger and shows altitude labels, with below-horizon bodies dimmed.
8. Mobile: acceptable after responsive stacking, but still dense because the app contains many controls.
9. Table dominance: improved. The raw result table remains lower in the page.
10. Interactivity: improved. Date, mode, range, timeline, chart hover/click and multi-night cards update the view.

Remaining design limits:

- The summer example for Berlin on 2026-07-05 has no real astronomical night, so the hero intentionally shows a negative planning result.
- The night boundary times are interpolated from the configured interval samples. Smaller intervals improve visual precision.
- The Moon interference model does not yet include angular distance to a selected deep-sky target.
