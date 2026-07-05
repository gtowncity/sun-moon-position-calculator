# DECISIONS

Stand: 2026-07-03

Dieses Dokument hält die technischen Vorentscheidungen für ein öffentliches Webtool zur Berechnung von Sonnen- und Mondpositionen fest. Es ist bewusst konservativ formuliert: astronomische Ergebnisse sollen korrekt, reproduzierbar und ehrlich dokumentiert sein.

## Projektziel

Das spätere Tool soll für vom Nutzer gewählte Zeitpunkte topozentrische Positionen von Sonne und Mond berechnen und tabellarisch sowie als CSV, XLSX, TXT und Markdown exportieren.

Eingaben:

- Himmelskörper: Sonne, Mond oder beide
- Datum, Uhrzeit und Auswertungszeitraum
- Intervall, z. B. 1, 5, 10, 15, 20, 30 oder 60 Minuten
- IANA-Zeitzone
- Koordinaten manuell, per Browser-Geolocation oder per Ort-/PLZ-Suche
- Sprache Deutsch/Englisch

Nicht-Ziele für den MVP:

- kein Live-Backend für JPL Horizons
- keine ungeprüfte Eigenimplementierung komplexer Ephemeriden
- keine Behauptung von Laborpräzision ohne Referenztests
- keine lokale-Horizont-Modellierung für Berge, Gebäude oder Geländeprofile

## Zentrale Entscheidungen

### D1: Runtime-Algorithmus

Empfehlung: Option A, Astronomy Engine für Sonne und Mond als Runtime verwenden.

Begründung:

- Astronomy Engine ist für JavaScript/TypeScript und Browser geeignet.
- Die Bibliothek berechnet Sonne, Mond, Planeten, horizontale Koordinaten, Auf-/Untergänge und Mondphasen.
- Sie ist MIT-lizenziert und damit grundsätzlich kompatibel mit einem öffentlichen Open-Source-GitHub-Projekt.
- Die Projektbeschreibung nennt eine Zielgenauigkeit von etwa +/- 1 arcminute und Tests gegen NOVAS, JPL Horizons und weitere Referenzen.
- Die Bibliothek unterstützt topozentrische horizontale Positionen für Beobachterkoordinaten und optionale Refraktionskorrektur.

Quellen:

- Astronomy Engine GitHub: https://github.com/cosinekitty/astronomy
- Astronomy Engine README nennt MIT-Lizenz, Browser-/JS-Unterstützung, +/- 1 arcminute, Tests gegen JPL Horizons/NOVAS und topozentrische horizontale Positionen.

Konsequenz:

- Die spätere Implementierung darf Astronomy Engine als Runtime einbinden.
- Die Projekt-Dokumentation darf nicht behaupten, exakter als die Bibliothek selbst oder die projektinternen Validierungsdaten zu sein.
- JPL Horizons wird als Validierungsreferenz verwendet, nicht als Laufzeit-Backend.

### D2: NREL SPA

Empfehlung: NREL SPA nur als wissenschaftliche Referenz und Vergleichsmaßstab behandeln, nicht als kopierten, portierten oder abgeleiteten Code verwenden.

Begründung:

- Die offizielle NREL/NLR-SPA-Seite nennt fuer den Algorithmus den Zeitraum Jahr -2000 bis 6000 und Unsicherheiten von +/- 0.0003 Grad.
- Dieselbe Seite stellt den offiziellen Code unter Bedingungen bereit, die interne, nicht-kommerzielle Nutzung und keine Weiterverteilung vorsehen.
- Ein öffentliches GitHub-Projekt wäre Weiterverteilung. Damit ist der offizielle NREL-SPA-Code fuer dieses Projekt zu vermeiden.

Quelle:

- NREL/NLR SPA-Seite: https://midcdmz.nlr.gov/spa/

Konsequenz:

- Kein Download, Kopieren, Portieren oder Ableiten aus `spa.c`, `spa.h`, Testcode oder CRBasic-Code.
- Keine NPM-Pakete verwenden, die behaupten, NREL SPA zu portieren, solange deren Herkunft und Lizenz nicht eindeutig sauber sind.
- Die SPA-Publikation darf als wissenschaftliche Referenz gelesen und zitiert werden; konkrete Implementierungsdetails muessen unabhängig und ohne Codeübernahme entstehen.

### D3: JPL Horizons

Empfehlung: JPL Horizons nur zur Validierung verwenden.

Begründung:

- JPL Horizons ist eine starke Referenzquelle fuer Ephemeriden und topozentrische Observer-Tabellen.
- Als Live-Runtime fuer eine statische GitHub-Pages-App ist Horizons ungeeignet: Online-Abhängigkeit, Verfügbarkeit, mögliche Limits, Datenschutz und Reproduzierbarkeit.
- Validierungsdaten sollen versioniert und als Testfixtures gespeichert werden, sobald sie erzeugt wurden.

Quellen:

- Horizons API: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- Horizons Manual: https://ssd.jpl.nasa.gov/horizons/manual.html

Konsequenz:

- Keine erfundenen Referenzwerte.
- Referenzdaten werden erst nach kontrollierten Horizons-Abfragen in Testfixtures übernommen.
- Jede Fixture dokumentiert Query-Parameter, Zeitpunkt der Erzeugung, Target, Observer, Refraction-Modus, Zeitstandard und Koordinatensystem.

### D4: Zeitmodell

Empfehlung: IANA-Zeitzonen mit Temporal verwenden, vorzugsweise `@js-temporal/polyfill` bis Browser-Support ausreicht.

Begründung:

- Native `Date` ist für lokale Kalenderzeit, IANA-Zonen, DST-Lücken und doppelte Zeiten fehleranfällig.
- Temporal trennt PlainDate, PlainTime, ZonedDateTime und Instant sauber.
- Die spätere App muss lokale Zeit in UTC umwandeln, dabei DST-Lücken und doppelte Zeiten erkennen und dem Nutzer anzeigen.
- Die Zeitzonenauswahl soll `Intl.supportedValuesOf("timeZone")` nutzen, mit Fallback-Liste nur falls nötig.

Quellen:

- Temporal Dokumentation: https://tc39.es/proposal-temporal/docs/
- MDN Temporal.ZonedDateTime: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal/ZonedDateTime
- MDN `Intl.supportedValuesOf`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/supportedValuesOf

Konsequenz:

- Keine naive UTC-Offset-Logik.
- Exporte enthalten lokale Zeit, Zeitzone und UTC-Zeit.
- Ambige oder ungültige lokale Zeiten bei DST werden validiert und sichtbar gemacht.

### D5: Geolocation und Geocoding

Empfehlung: Browser-Geolocation nur auf expliziten Nutzerklick; Open-Meteo Geocoding als austauschbarer Provider prüfen.

Begründung:

- Browser-Geolocation erfordert Nutzerzustimmung und sichere Kontexte.
- Die Standortabfrage darf nicht automatisch beim Laden erfolgen.
- Open-Meteo Geocoding unterstützt Ortsnamen und Postleitzahlen und liefert Koordinaten, Höhe und Zeitzone.
- Die freie Open-Meteo-API ist laut Terms nur nicht-kommerziell nutzbar und rate-limited; das muss für ein öffentliches Projekt sichtbar dokumentiert werden.

Quellen:

- MDN Geolocation API: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
- MDN `getCurrentPosition`: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition
- Open-Meteo Geocoding: https://open-meteo.com/en/docs/geocoding-api
- Open-Meteo Terms: https://open-meteo.com/en/terms

Konsequenz:

- Geocoding wird modular gekapselt.
- Provider-spezifische Terms, Attribution und Datenschutzinfos werden im UI/README dokumentiert.
- Fuer kommerzielle Nutzung muss entweder ein bezahlter Open-Meteo-Plan, Self-Hosting oder ein anderer Provider vorgesehen werden.

### D6: Ausgabe-Datenmodell

Empfehlung: Eine Tabellenzeile pro Zeitpunkt und Himmelskörper.

Begründung:

- Einheitlicher Export fuer Sonne und Mond.
- Einfacher zu filtern, sortieren und erweitern.
- Zusätzliche Körper oder Werte können später ergänzt werden, ohne breite Tabellen mit vielen leeren Spalten zu erzwingen.
- Mond-spezifische Felder wie Phase oder Beleuchtung können in Sonnenzeilen leer bleiben.

Vorgeschlagene Spalten:

- `localDate`
- `localTime`
- `timeZone`
- `utcTime`
- `latitude`
- `longitude`
- `elevationMeters`
- `body`
- `azimuthDeg`
- `altitudeDeg`
- `zenithDeg`
- `apparentAltitudeDeg`
- `rightAscension`
- `declinationDeg`
- `distanceKm`
- `phaseName`
- `illuminationPercent`

Konsequenz:

- Die Tabellenkomponente und alle Exporter arbeiten mit demselben normalisierten Datenmodell.
- Alle numerischen Felder behalten intern Zahlenwerte; Formatierung passiert erst in UI/Export.

### D7: Internationalisierung

Empfehlung: Deutsch und Englisch von Anfang an als Datenstruktur planen.

Spätere Struktur:

- `src/i18n/de.ts`
- `src/i18n/en.ts`

Konsequenz:

- Keine hart codierten UI-Texte in Komponenten.
- Tabellenüberschriften, Validierungsfehler, Export-Dateinamen, Genauigkeitshinweise und Statusmeldungen werden übersetzt.

### D8: Export

Empfehlung:

- CSV: eigene, kleine Exportfunktion mit UTF-8, Headern, Dezimalpunkt und sauberem Escaping.
- XLSX: SheetJS CE oder ExcelJS prüfen; bevorzugt SheetJS CE wegen direkter Browser-XLSX-Erzeugung, aber Bundlegröße und Bezugsweg prüfen.
- TXT: lesbare Texttabelle.
- Markdown: Markdown-Tabelle mit Escaping von Pipes und Zeilenumbrüchen.

Konsequenz:

- XLSX darf keine umbenannte HTML-Tabelle sein.
- Zahlenwerte muessen in XLSX echte Zahlen bleiben.

## Bewertete Runtime-Optionen

### Option A: Astronomy Engine fuer Sonne und Mond

Status: empfohlen fuer MVP.

Vorteile:

- Browser- und JavaScript-/TypeScript-tauglich.
- MIT-lizenziert.
- Etablierte Bibliothek fuer Sonne, Mond, horizontale Koordinaten, Mondphase und verwandte Ereignisse.
- Topozentrische horizontale Koordinaten möglich.
- Validierung der Bibliothek gegen JPL Horizons/NOVAS wird vom Projekt genannt.

Nachteile:

- Nicht identisch mit NREL SPA oder JPL Horizons.
- Projektgenauigkeit muss konservativ angegeben und durch eigene Tests belegt werden.
- Refraktion, Druck/Temperatur und lokaler Horizont bleiben Modellannahmen.

### Option B: Eigenes Solar-Modul nach publizierten SPA-/Meeus-Formeln

Status: nicht fuer MVP empfohlen.

Vorteile:

- Potenziell sehr hohe Sonnenpräzision.
- Volle Kontrolle ueber Implementierung und Datenmodell.

Nachteile:

- Hoher Implementierungs- und Validierungsaufwand.
- Größeres Risiko fuer subtile Fehler bei Zeitstandards, Delta T, Nutation, Aberration, Refraktion und Koordinatentransformationen.
- Urheberrechtliche Abgrenzung zum NREL-Code muss extrem sauber sein.

Zulässiger Rahmen:

- Publikationen und Bücher als Referenz nutzen.
- Keinen NREL-Code kopieren, portieren oder strukturell nachbilden.
- Erst nach separatem Design-Review und Testplan beginnen.

### Option C: JPL Horizons live als Backend

Status: nicht als Runtime empfohlen.

Vorteile:

- Starke Referenzquelle.
- Sehr gute wissenschaftliche Nachvollziehbarkeit.

Nachteile:

- Online-Abhängigkeit.
- Nicht ideal fuer statische GitHub Pages.
- Datenschutz- und Verfügbarkeitsfragen.
- Mögliche API-Änderungen, Latenz und Rate-Limits.
- Keine vollständige lokale Reproduzierbarkeit.

Zulässiger Rahmen:

- Validierungsskripte und gespeicherte Testfixtures.

## Offene Punkte

- Endgültige Wahl der XLSX-Bibliothek nach Bundle- und Lizenzprüfung.
- Konkrete JPL-Horizons-Fixtures müssen erzeugt werden.
- Toleranzen werden nach den ersten Referenzvergleichen kalibriert, nicht vorher als endgültige Genauigkeit behauptet.
- Entscheidung, ob Druck/Temperatur als erweiterte Eingaben angeboten werden oder mit dokumentierten Standardwerten laufen.
- Entscheidung, ob Höhe manuell editierbar ist, wenn Geocoding keine oder ungenaue Höhe liefert.

## Implementierungsempfehlung

Für den MVP soll die Implementierung auf Option A basieren:

- Vite + React + TypeScript
- Astronomy Engine als Runtime für Sonne und Mond
- Temporal bzw. `@js-temporal/polyfill` fuer IANA-Zeitzonen und DST
- Open-Meteo Geocoding als austauschbarer Provider
- JPL Horizons nur fuer Validierung
- Keine NREL-Codeübernahme

