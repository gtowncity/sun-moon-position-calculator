# SunMoon.exe Windows 98 shell prototype

This branch is a safe prototype branch. It starts from the stable functional audit commit and does not change `main`.

## Goal

Create the visual target before touching production UI again.

The target is not an amber terminal page. The target is a Windows 98 desktop program:

- gray application window
- active blue title bar
- menu row: Datei, Analyse, Ansicht, Export, Hilfe
- toolbar row with small icon buttons
- classic 3D bevels
- group boxes and sunken input fields
- status bar at the bottom
- embedded amber astronomy instruments only inside chart/scope panels

## First screen layout

```text
Desktop teal background
└─ SunMoon.exe main window
   ├─ Titlebar
   ├─ Menu bar
   ├─ Toolbar
   ├─ Status strip
   ├─ Main grid
   │  ├─ Eingabe / Control Panel
   │  ├─ Astro night result
   │  ├─ Ergebnis summary
   │  ├─ Night timeline
   │  ├─ Altitude CRT scope
   │  ├─ Radar compass
   │  └─ Multi-night database
   └─ Bottom statusbar
```

## Acceptance gate before wiring real app

Do not wire the production dashboard into this until a screenshot of this prototype passes visual review against the user's Zeitrechner.exe reference.

Checklist:

- first glance says old Windows program
- no full-page black amber terminal
- no modern dashboard cards
- no giant raw table dominating the page
- amber appears only in instruments
- input/result/timeline/instruments/table are clearly separated

## Next work

1. Add isolated `Win98Window`, `Win98TitleBar`, `Win98Toolbar`, `Win98GroupBox`, `Win98Button`, `Win98DataGrid` components.
2. Add isolated `Win98AstroShellPrototype` component.
3. Add a preview-only route or story-like dev page.
4. Take screenshots.
5. Only then map real data into the approved shell.
