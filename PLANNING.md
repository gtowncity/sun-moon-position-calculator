# PLANNING.md

## Ziel

`solar-lunar-position-tool` soll ein lokal im Browser laufendes Web-Tool fuer reproduzierbare Sonnen- und Mondpositionsberechnungen werden. Es soll Beobachterkoordinaten, Hoehe, IANA-Zeitzone, lokale Zeit, Auswertungsintervall und Zielkoerper beruecksichtigen und Ergebnisse mit Validierungs- und Genauigkeitshinweisen exportieren.

## Bestandsaufnahme nach ZIP-Inspektion

Gepruefter Ordner: `C:\Users\Tobi\Desktop\Sun and Moon`.

Vorhanden ist bereits ein Vite + React + TypeScript Projekt mit `package.json`, `vite.config.ts`, `tsconfig*.json`, `src/`, `tests/`, `dist/`, `node_modules/` und Git-Metadaten. Der Paketname lautet aktuell noch `sun-moon-position-calculator`; Zielname ist `solar-lunar-position-tool`.

Vorhandene Abhaengigkeiten:

- React, React DOM, Vite, TypeScript, Vitest, Testing Library
- `astronomy-engine`
- `@js-temporal/polyfill`
- `exceljs`
- `lucide-react`

Vorhandene Module:

- `src/app/App.tsx`: bestehende UI fuer Zielkoerper, Standort, Zeitbereich, Geocoding, Geolocation, gespeicherte Orte, Berechnung und Export.
- `src/components/ResultTable.tsx`: Ergebnis-Tabelle.
- `src/types/index.ts`: zentrale, aber noch zu knappe Typen.
- `src/lib/astronomy/calculator.ts`: topozentrische Sonnen-/Mondpositionen ueber `astronomy-engine`.
- `src/lib/time/dateTime.ts`: Temporal-Konvertierung, DST-Gap-/Ambiguous-Erkennung, Intervallgenerator.
- `src/lib/time/timeZones.ts`: IANA-Zeitzonen ueber `Intl.supportedValuesOf` mit Fallback.
- `src/lib/location/*`: Koordinatenvalidierung, Geolocation, lokale Speicherung von Orten.
- `src/lib/geocoding/*`: Open-Meteo-Geocoding-Provider.
- `src/lib/export/*`: XLSX, TXT, Markdown; CSV fehlt.
- `src/lib/solar/phases.ts`: grobe Phasenzusammenfassung anhand berechneter Sonnenhoehen, kein exakter Rise/Set-Solver.
- `src/i18n/de.ts` und `src/i18n/en.ts`: Uebersetzungen, aber nicht als JSON; die deutsche Datei enthaelt Mojibake/Encoding-Schaeden.
- `tests/*.test.ts`: Unit-Tests fuer Astronomie-Basismodell, Zeit, Standort, Geocoding, Export, Sortierung und App-Ladezustand.
- `docs/validation/fixtures/README.md` und `src/lib/validation/jplFixtures.ts`: noch keine echten JPL-Fixtures.

Bereits erfuellte Anforderungen:

- Vite + React + TypeScript vorhanden.
- Strict TypeScript ist aktiv.
- Vitest ist vorhanden.
- `astronomy-engine` und `@js-temporal/polyfill` sind vorhanden.
- Sonnen-, Mond- und kombinierte Berechnung sind vorhanden.
- Topozentrische Berechnung wird ueber `Equator(..., observer, true, true)` und `Horizon` genutzt.
- Browser-Geolocation erfolgt nur nach Button-Klick.
- Open-Meteo-Geocoding ist modular vorhanden und zeigt Ergebnislisten.
- IANA-Zeitzonen-Dropdown ist vorhanden.
- DST-Gap und DST-Ambiguity werden erkannt.
- Intervallberechnung erfolgt ueber echte `Temporal.Instant`-Schritte.
- TXT, Markdown und XLSX existieren grundsaetzlich.
- Lokales Speichern von Orten ist opt-in und loeschbar.

Fehlende oder unvollstaendige Anforderungen:

- `PLANNING.md`, `ACCURACY.md`, `ALGORITHMS.md`, `VALIDATION.md`, `PRIVACY.md`, `LIMITATIONS.md`, `CHANGELOG.md` fehlen bzw. existieren nur als anders benannte Entwurfsdokumente.
- Paketname ist noch nicht `solar-lunar-position-tool`.
- `src/domain/types.ts` und die gewuenschte Astro-/Timezone-/Export-Struktur fehlen.
- CSV-Export fehlt.
- XLSX-Sheets entsprechen nicht den geforderten Namen `Results`, `Metadata`, `Events`, `ValidationInfo`.
- Export-Metadaten sind noch nicht vollstaendig und nicht uebergreifend konsistent.
- Refraktionsoptionen `none`, `standard`, `custom` fehlen.
- Geometrische und apparent Hoehe/Zenitwinkel sind im Datenmodell noch nicht sauber getrennt.
- Rise/Set/Transit fuer Sonne und Mond fehlen.
- Summary Cards fuer aktuelle Positionen und naechste Ereignisse fehlen.
- Einzelzeitpunkt-Modus fehlt.
- Benutzerdefiniertes Intervall ist nur indirekt bzw. nicht sauber umgesetzt.
- Ergebnislimit liegt bei 5.000 statt gefordertem Ziel von 10.000 Zeitpunkten.
- UI-Texte sind nicht vollstaendig ueber JSON-i18n organisiert.
- Sprache wird noch nicht in `localStorage` gespeichert.
- Playwright ist noch nicht eingerichtet.
- JPL-Horizons-Referenzfixtures fehlen; Werte duerfen nicht erfunden werden.
- NREL-SPA ist nicht als Runtime-Verfahren implementiert; vorhandener Code nutzt `astronomy-engine` auch fuer die Sonne. Das muss ehrlich dokumentiert werden.
- NOAA ist nicht dokumentiert.
- Polargebietsfaelle, No-rise/no-set und Refraktionsgrenzen sind nicht ausreichend getestet/dokumentiert.

## Risiken

- Der offizielle NREL-SPA-Code darf wegen Lizenzbedingungen nicht blind kopiert oder portiert werden. Ohne sauber lizenzierte SPA-Implementierung und ohne externe Referenzabfrage kann keine echte NREL-SPA-Genauigkeit behauptet werden.
- JPL-Horizons-Werte koennen ohne externe Abfrage nicht sicher erzeugt werden. Fixtures werden daher mit klaren `TODO_REFERENCE_VALUE`-Platzhaltern angelegt, nicht als bestandene Referenztests missbraucht.
- Atmosphaerische Refraktion ist wetterabhaengig. Eine Standard- oder Bennett-Naheformel kann reale Bedingungen am Horizont nicht garantieren.
- Open-Meteo-Geocoding kann uneindeutige Orts- und PLZ-Treffer liefern. Die UI muss Auswahl erzwingen.
- Polargebiete und Mondaufgang/Monduntergang koennen an lokalen Tagen keine Ereignisse enthalten.
- Playwright kann erst vollstaendig laufen, wenn die Abhaengigkeit installiert ist und Browser-Binaries verfuegbar sind.

## Architekturentscheidung

Das bestehende Projekt wird erweitert statt neu initialisiert. Die vorhandene Vite/React/TypeScript-Basis passt zum Zielstack, und brauchbare Module fuer Geocoding, Geolocation, Temporal-Zeitlogik und erste Tests bleiben erhalten.

Neue bzw. konsolidierte Struktur:

- `src/domain/types.ts`: zentrale Typen und Rueckwaertskompatibilitaetsaliases.
- `src/astro/common/`: Winkel, Refraktion, gemeinsame Hilfen.
- `src/astro/solar/`: Sonnenpositionsadapter und Ereignisse auf Basis der validierten Runtime-Bibliothek.
- `src/astro/lunar/`: Mondpositionsadapter und Mondphase/Beleuchtung.
- `src/astro/events.ts`: Rise/Set/Transit ueber `astronomy-engine`.
- `src/export/`: CSV/XLSX/TXT/Markdown-Exports mit gemeinsamen Metadaten.
- `src/i18n/de.json`, `src/i18n/en.json`: zentrale Uebersetzungen.
- Bestehende `src/lib/*` Module bleiben als Adapter erhalten, wo das Risiko einer Vollmigration hoeher waere.

## Algorithmusentscheidungen

- Mond: Primaere Runtime-Berechnung ueber `astronomy-engine`, topozentrisch, inklusive Parallaxe durch Beobachterstandort.
- Sonne: Runtime-Berechnung vorerst ebenfalls ueber `astronomy-engine`. NREL SPA bleibt dokumentiertes Referenz-/Zielverfahren, aber es wird keine SPA-Genauigkeit behauptet, solange kein sauber lizenzierter SPA-Port und keine echten Referenzfixtures vorliegen.
- Refraktion: `none` berechnet geometrisch; `standard` nutzt die Standardrefraktion der Astronomy Engine; `custom` nutzt eine dokumentierte Bennett-nahe Korrektur, skaliert mit Druck und Temperatur.
- Zeit: Lokale Eingaben werden mit Temporal in IANA-Zonen in eindeutige Instants uebersetzt. Intervallschritte laufen immer in UTC/Instant-Schritten.
- Ereignisse: Aufgang/Untergang ueber `SearchRiseSet`, Transit/Kulmination ueber `SearchHourAngle` bzw. Tagesfensterpruefung.

## Genauigkeitsziele

- Sonnenposition: Ziel < 0,01 Grad gegen NREL-SPA/JPL-Referenzen; aktuell nicht garantiert, bis echte Referenzfixtures vorliegen.
- Mondposition: Ziel moeglichst < 0,1 Grad gegen JPL Horizons; aktuell nicht garantiert, bis echte Referenzfixtures vorliegen.
- Rise/Set: Ziel Sonne < 1 Minute, Mond moeglichst < 1-2 Minuten; aktuell als Algorithmusziel dokumentiert und mit Platzhalterfixtures vorbereitet.

## Validierungsstrategie

- Strukturierte JSON-Fixtures unter `validation/references/` fuer Berlin Sommer/Winter, Greenwich, New York, Sydney, Tromso, Aequatornaehe, Mond nahe Horizont, Sonne nahe Horizont und DST-Faelle.
- Keine erfundenen Referenzwerte. Fehlende Werte werden als `TODO_REFERENCE_VALUE` markiert.
- Unit-Tests pruefen nur echte Invarianten und vorhandene Runtime-Konsistenz, nicht erfundene astronomische Wahrheiten.
- `VALIDATION.md` beschreibt, wie JPL-Horizons- und NREL-Referenzwerte nachzutragen sind.

## Teststrategie

- Vitest fuer reine Funktionen: Koordinaten, Winkel, Refraktion, Zeit/DST, Intervall, Exporte, i18n-Vollstaendigkeit, Ereignisstruktur.
- Astro-Tests gegen vorhandene Bibliothekskonsistenz und spaeter echte Fixtures.
- Playwright-E2E wird eingerichtet, soweit Abhaengigkeiten installierbar sind.
- Build muss mit `npm run build` laufen.
- Standardtest muss mit `npm test` laufen.

## Implementierungsreihenfolge

1. Planung und Dokumentation aktualisieren.
2. Zentrale Typen und i18n-JSON-Struktur anlegen.
3. Astro-Adapter fuer Positionen, Refraktion und Ereignisse ausbauen.
4. Export-Metadaten, CSV und geforderte XLSX-Sheets implementieren.
5. UI fuer Einzelzeitpunkt, Refraktion, Summary Cards, Ereignisse und CSV erweitern.
6. Validierungsfixture-Struktur anlegen.
7. Tests fuer neue Kernlogik und Exporte ergaenzen.
8. `npm install`, Build, Unit-Tests und soweit moeglich E2E ausfuehren.
9. `CHANGELOG.md` mit Abschlussstand aktualisieren.

## Offene Punkte bis echte Referenzen vorliegen

- Echte JPL-Horizons-Werte muessen extern erzeugt und in Fixtures eingetragen werden.
- Eine sauber lizenzierte NREL-SPA-konforme Runtime-Implementierung muss separat bewertet werden, falls die 0,01-Grad-Sonnenzielgenauigkeit verbindlich werden soll.
- Wetter-/Horizont-/Topographieeffekte bleiben bewusst ausserhalb des Modells.

## Abschlussnotiz nach Umsetzung

Wird nach Implementierung, Build und Tests mit dem tatsaechlichen Ergebnis aktualisiert.
