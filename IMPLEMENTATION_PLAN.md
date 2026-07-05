# IMPLEMENTATION PLAN

Stand: 2026-07-03

Dieses Dokument plant die spätere Implementierung. In diesem Schritt wird noch kein Anwendungscode geschrieben.

## Empfohlener Tech-Stack

Frontend:

- Vite
- React
- TypeScript
- CSS Modules oder einfacher globaler CSS-Ansatz fuer MVP

Astronomie:

- Astronomy Engine fuer Sonne und Mond
- JPL Horizons nur fuer Validierungsfixtures
- NREL SPA nicht als Code verwenden

Zeit:

- Temporal API über `@js-temporal/polyfill`, solange native Unterstützung nicht ausreichend ist
- IANA-Zeitzonen
- `Intl.supportedValuesOf("timeZone")` fuer Dropdown, Fallback-Liste nur bei Bedarf

Geolocation/Geocoding:

- Browser Geolocation API nur nach Klick
- Open-Meteo Geocoding als austauschbarer Provider

Export:

- CSV/TXT/Markdown mit eigenen kleinen Funktionen
- XLSX mit SheetJS CE oder ExcelJS nach finaler Prüfung

Tests:

- Vitest
- React Testing Library fuer UI
- Playwright optional fuer E2E und Export-Download-Flows
- JPL-Horizons-Fixtures fuer astronomische Regressionen

## Architektur

Spätere Struktur:

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

Verantwortlichkeiten:

- `src/app/`: App-Komposition, State-Orchestrierung
- `src/components/`: reine UI-Komponenten
- `src/lib/astronomy/`: Berechnungsadapter, Körperauswahl, Normalisierung der Ergebnisse
- `src/lib/time/`: IANA-Zeitzonen, Temporal-Konvertierung, Intervalle, DST-Behandlung
- `src/lib/location/`: Koordinatenvalidierung, Browser-Geolocation, Standortmodell
- `src/lib/geocoding/`: Provider-Interface und Open-Meteo-Adapter
- `src/lib/export/`: CSV, XLSX, TXT, Markdown
- `src/lib/validation/`: Fixture-Loader, JPL-Vergleiche, Toleranzen
- `src/i18n/`: Übersetzungen Deutsch/Englisch
- `src/types/`: zentrale Typen
- `tests/`: Unit-, Integration- und Fixture-Tests
- `docs/`: Validierungsnotizen und ggf. Fixture-Erzeugung

Regel:

- Keine astronomische Logik in UI-Komponenten.
- Keine Zeitkonvertierung in Komponenten.
- Exporter verwenden dasselbe normalisierte Datenmodell wie die Tabelle.

## Datenmodell

Empfohlen: Eine Zeile pro Zeitpunkt und Himmelskörper.

Späterer Typ, konzeptionell:

```text
ResultRow
  localDate
  localTime
  timeZone
  utcTime
  latitude
  longitude
  elevationMeters
  body
  azimuthDeg
  altitudeDeg
  zenithDeg
  apparentAltitudeDeg
  rightAscension
  declinationDeg
  distanceKm
  phaseName
  illuminationPercent
```

Warum nicht breite Sonnen-/Mondspalten?

- Eine Zeile pro Körper ist besser fuer Export, Filterung und spätere Erweiterung.
- Tabellen mit beiden Körpern bleiben gleich strukturiert.
- Mond-spezifische Felder können leer bleiben, ohne das Schema zu verändern.

## Zeit- und Intervallplanung

Eingaben:

- Startdatum
- Startzeit
- Zeitzone
- Enddatum/Endzeit oder Start + Dauer
- Intervall in Minuten

Regeln:

- Lokale Eingaben werden mit IANA-Zeitzone in eindeutige Instants umgewandelt.
- DST-Start: ungültige lokale Zeiten werden als Validierungsfehler angezeigt.
- DST-Ende: doppelte lokale Zeiten werden sichtbar gemacht; MVP kann eine klare Default-Disambiguation nutzen, muss sie aber anzeigen.
- Intervallgeneration erfolgt auf Instants/UTC, nicht durch naive lokale Minutenaddition.
- Anzeige erfolgt wieder in lokaler Zeit.
- Export enthält lokale und UTC-Zeit.

Warnungen:

- Endzeit muss nach Startzeit liegen.
- Intervall > 0.
- Zu viele Zeilen lösen Warnung aus, z. B. ab 5.000 ResultRows.
- Bei Sonne+Mond verdoppelt sich die Zeilenzahl.

## Standortplanung

Manuelle Koordinaten:

- Latitude: -90 bis +90
- Longitude: -180 bis +180
- Elevation meters: numerisch, optional; Default dokumentieren

Browser-Geolocation:

- Nur nach Klick auf "Alle Daten automatisch ermitteln" oder separaten Standortbutton.
- Keine Abfrage beim Laden.
- HTTPS/Secure Context beachten.
- Fehlerfälle:
  - Zugriff verweigert
  - Standort nicht verfügbar
  - Timeout
  - geringe Genauigkeit
- `accuracy` aus Geolocation anzeigen, falls verfügbar.

Ort-/PLZ-Suche:

- Provider-Interface definieren.
- Open-Meteo als erster Adapter.
- Ergebnisliste mit Name, Land, Region, Koordinaten, Höhe und Zeitzone.
- Nicht blind ersten Treffer verwenden.

## Automatikbutton

Buttontext:

- Deutsch: "Alle Daten automatisch ermitteln"
- Englisch: "Detect all data automatically"

Setzt:

- Browser-Koordinaten, falls Nutzer zustimmt
- Browser-Zeitzone
- aktuelles Datum
- aktuelle Uhrzeit
- Browser-Sprache, falls sinnvoll

Setzt bewusst nicht:

- Intervall
- Zeitraum/Dauer
- Himmelskörperauswahl, außer eine klare Default-Auswahl ist dokumentiert

Fehlerverhalten:

- Teilerfolg erlauben: Wenn Geolocation abgelehnt wird, können Zeit, Zeitzone und Sprache trotzdem gesetzt werden.
- Nutzerfreundliche Fehlermeldung ohne Blockierung der manuellen Eingabe.

## UI/UX-Plan

Bereiche:

- Sprache
- Auswahl Sonne/Mond/beides
- Standort
- Automatische Ermittlung
- Datum/Zeit
- Zeitraum
- Intervall
- Zeitzone
- Berechnen
- Ergebnis-Tabelle
- Export-Buttons
- Genauigkeitshinweise

Validierung:

- Latitude -90 bis +90
- Longitude -180 bis +180
- Datum gültig
- Uhrzeit gültig
- Zeitzone gültig
- Endzeit nach Startzeit
- Intervall > 0
- Warnung bei zu vielen Zeilen
- Warnung bei fehlender Höhe, wenn relevant
- Warnung bei geocodingbasierter Stadtzentrum-Koordinate

UX-Grundsätze:

- Erste Ansicht ist das Tool, keine Marketing-Landingpage.
- Dichte, klare Eingabeoberfläche.
- Ergebnis-Tabelle direkt sichtbar nach Berechnung.
- Genauigkeitshinweise kurz, aber auffindbar.
- Fehler inline bei den Feldern.
- Exportbuttons erst aktivieren, wenn Ergebnisse vorhanden sind.

## Export-Plan

### CSV

Anforderungen:

- UTF-8
- Header
- Dezimalpunkt, unabhängig von UI-Sprache
- RFC-ähnliches Escaping fuer Komma, Quotes, Zeilenumbrüche
- stabile Spaltenreihenfolge

### XLSX

Anforderungen:

- echte Zahlenwerte
- Headerzeile
- sinnvolle Spaltenbreiten
- keine HTML-Tabelle als Fake-XLS
- optional Freeze Pane fuer Header, falls Bibliothek leicht unterstützt

Bibliotheken:

- SheetJS CE: wahrscheinlich geeignet; Apache-2.0; Bezugsweg prüfen
- ExcelJS: MIT; Browser-Bundle prüfen

### TXT

Anforderungen:

- lesbare Texttabelle
- feste Spaltenbreiten oder simple aligned table
- UTF-8

### Markdown

Anforderungen:

- Markdown-Tabelle
- Pipes und Zeilenumbrüche escapen
- numerische Formatierung konsistent

## Internationalisierung

Spätere Dateien:

- `src/i18n/de.ts`
- `src/i18n/en.ts`

Zu übersetzen:

- UI-Labels
- Buttons
- Tabellenüberschriften
- Validierungsfehler
- Statusmeldungen
- Export-Dateinamen
- Genauigkeitshinweise
- Himmelskörpernamen
- Mondphasennamen

Regel:

- Keine hart codierten UI-Texte in Komponenten.
- Exporte nutzen Spracheinstellung fuer Header und Dateinamen, aber numerische Maschinenwerte bleiben sprachneutral mit Dezimalpunkt, falls Format das erwartet.

## Berechnungsmodul-Plan

Astronomie-Adapter:

- Eingabe: Liste von UTC-Instants, Observer, ausgewählte Körper, Refraktionsoption
- Ausgabe: normalisierte `ResultRow[]`
- Sun/Moon-Logik kapseln
- Astronomy-Engine-spezifische API nicht in UI leaken

Zu klärende Details:

- Welche Astronomy Engine Funktionen fuer apparent topocentric horizontal position optimal sind.
- Wie Refraktion konfiguriert wird.
- Welche RA/DEC-Variante exportiert wird.
- Wie Distanz fuer Sonne/Mond geliefert wird.
- Wie Mondphase und Beleuchtung berechnet werden.

## Teststrategie

Unit-Tests:

- Koordinatenvalidierung
- Zeitzonen-Konvertierung
- DST-Lücken
- DST-Doppelzeiten
- Intervallgenerierung
- Himmelskörperauswahl
- ResultRow-Normalisierung
- CSV Escaping
- Markdown Escaping
- TXT Tabellenbreiten
- XLSX Workbook-Struktur, soweit testbar
- Fehlermeldungen

Integration-Tests:

- Eingaben -> ResultRows
- ResultRows -> Tabelle
- ResultRows -> Exporte
- Ortssuche mocked
- Geolocation mocked

Astronomische Tests:

- JPL-Horizons-Fixtures fuer Sonne und Mond
- Toleranzen pro Körper und Größe
- Horizontnahe Fälle getrennt
- Airless und Refracted getrennt
- Berlin, New York, Sydney, Quito/Äquatornähe, Tromsø/hohe Breite
- Sommerzeit, Winterzeit, Tagundnachtgleiche, Sonnenwenden, Vollmond, Neumond, Mond nahe Horizont

E2E:

- Sprache umschalten
- manuelle Koordinaten berechnen
- automatische Daten teilweise erfolgreich
- Ortssuche auswählen
- Exportbuttons erzeugen Dateien
- Warnung bei zu vielen Zeilen

## Implementierungsphasen

### Phase 1: Projektgrundlage

- Vite React TypeScript Setup
- Lint/Test-Grundlage
- i18n-Struktur
- zentrale Typen

### Phase 2: Zeit und Eingabevalidierung

- Temporal-Integration
- Zeitzonenliste
- lokale Zeit -> UTC
- DST-Validierung
- Intervallgenerator

### Phase 3: Standort

- Koordinatenformular
- Browser-Geolocation
- Open-Meteo Adapter
- Provider-Interface

### Phase 4: Astronomie

- Astronomy Engine Adapter
- Sonne/Mond/beides
- topozentrische horizontale Koordinaten
- Mondphase/Beleuchtung
- Datenmodell-Normalisierung

### Phase 5: UI

- Tool-Layout
- Eingabebereiche
- Ergebnis-Tabelle
- Genauigkeitshinweise
- Fehler- und Warnzustände

### Phase 6: Export

- CSV
- TXT
- Markdown
- XLSX
- Dateinamen/i18n

### Phase 7: Validierung

- Horizons Query-Dokumentation finalisieren
- Fixtures erzeugen
- astronomische Regressionstests
- Toleranzen prüfen
- README-Genauigkeit finalisieren

### Phase 8: Veröffentlichung

- README finalisieren
- Third-Party Notices/Lizenzen
- GitHub Pages Deployment
- Datenschutz-/API-Hinweise

## Risiken

- NREL-SPA-Code darf nicht verwendet werden; unklare Ports sind zu vermeiden.
- Mondwerte sind empfindlicher gegen topozentrische Fehler als Sonnenwerte.
- Refraktionsvergleiche nahe Horizont können zwischen Modellen abweichen.
- Zeitzonen und DST sind häufige Fehlerquelle.
- Open-Meteo Free API ist nicht-kommerziell und rate-limited.
- XLSX-Bibliothek kann Bundlegröße erhöhen.
- Zu große Zeiträume können Performance und UI belasten.

## Nächster Implementierungs-Prompt

Vorschlag:

"Setze jetzt den MVP gemäß den Planungsdokumenten um. Erstelle eine Vite-React-TypeScript-App ohne NREL-Code. Verwende Astronomy Engine fuer Sonne/Mond, Temporal fuer IANA-Zeitzonen, eine modulare Standort-/Geocoding-Schicht und ein normalisiertes ResultRow-Datenmodell. Implementiere UI, Validierung, Tabelle und CSV/TXT/Markdown-Export; XLSX nur mit zuvor final geprüfter Bibliothek. Erzeuge noch keine JPL-Referenzwerte, aber lege die Teststruktur so an, dass Horizons-Fixtures später ergänzt werden können."

