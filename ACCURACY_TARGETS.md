# ACCURACY TARGETS

Stand: 2026-07-03

Dieses Dokument definiert ehrliche, konservative Genauigkeitsziele fuer das spätere Sonnen- und Mondpositions-Tool. Es vermeidet Scheingenauigkeit und trennt Algorithmusfehler von Eingabe-, Modell- und Anzeigeeffekten.

## Grundsatz

Die Website soll nicht behaupten, astronomische Werte seien genauer, als die verwendeten Algorithmen, Eingabedaten und Validierung belegen.

Zulässige README-/Website-Aussagen:

- "Die Berechnung wird gegen JPL-Horizons-Referenzdaten getestet."
- "Die Genauigkeit hängt von Standort, Zeit, Refraktionsannahmen und Algorithmus ab."
- "Atmosphärische Refraktion ist eine Näherung."
- "Lokaler Horizont, Gebäude, Berge und Wetter werden nicht berücksichtigt."
- "Mondpositionen werden topozentrisch berechnet; Mondparallaxe wird nicht ignoriert."

Nicht zulässige Aussagen ohne zusätzliche Belege:

- "NREL-SPA-genau" fuer die Runtime, wenn Astronomy Engine verwendet wird.
- "JPL-identisch" fuer Browserberechnungen.
- "besser als 0,01 Grad" ohne dokumentierte Tests gegen JPL/NREL in relevanten Fällen.
- "exakte Aufgangs-/Untergangszeiten" ohne lokalen Horizont und Wetter.

## Runtime-Basis

Empfohlen ist Astronomy Engine als Runtime. Die Bibliothek beschreibt sich als klein, schnell und auf etwa +/- 1 arcminute ausgelegt und nennt Tests gegen NOVAS, JPL Horizons und weitere Quellen.

Quelle:

- https://github.com/cosinekitty/astronomy

Konsequenz:

- Initiale Genauigkeitsaussage des Projekts darf höchstens konservativ an diese Größenordnung anschließen.
- Projektinterne Toleranzen werden nach eigenen JPL-Horizons-Vergleichen kalibriert.
- Bis Referenzfixtures erzeugt sind, sind alle numerischen Zielwerte vorläufig.

## Vorläufige Genauigkeitsziele fuer MVP

Diese Ziele sind Testtoleranzen und Kommunikationsgrenzen, nicht garantiert physikalische Wahrheit fuer jeden Ort und jede Zeit.

| Größe | Vorläufiges Ziel | Hinweise |
| --- | ---: | --- |
| Sonnen-Azimut | <= 0,05 Grad gegen JPL Horizons | Nach Validierung ggf. enger setzen |
| Sonnen-Höhe ohne Refraktion | <= 0,05 Grad gegen JPL Horizons | Nahe Horizont separat bewerten |
| Sonnen-Höhe mit Refraktion | <= 0,10 Grad gegen JPL Horizons | Abhängig von Druck/Temperatur/Refraktionsmodell |
| Mond-Azimut | <= 0,10 Grad gegen JPL Horizons | Topozentrisch zwingend |
| Mond-Höhe ohne Refraktion | <= 0,10 Grad gegen JPL Horizons | Parallaxe relevant |
| Mond-Höhe mit Refraktion | <= 0,15 Grad gegen JPL Horizons | Nahe Horizont konservativer |
| Rektaszension/Deklination | <= 0,10 Grad vorläufig | Koordinatensystem exakt dokumentieren |
| Distanz Mond | konservativ nach erster Fixture | Einheit und Zentrum/Observer klären |
| Distanz Sonne | konservativ nach erster Fixture | AU/km und topozentrisch/geozentrisch klären |

Wichtig:

- Diese Toleranzen sind Platzhalter fuer Testdesign und dürfen im README nicht als endgültig bewiesene Genauigkeit erscheinen.
- Finale Toleranzen werden erst nach dem ersten Validierungsdatensatz festgelegt.

## Fehlerquellen

### Algorithmusfehler

Ursachen:

- Näherungsmodell der Bibliothek
- Ephemeridenmodell und Zeitskalen
- Nutation, Aberration, Lichtlaufzeit und Delta T
- Rundungsfehler

Kontrolle:

- Vergleich gegen JPL Horizons fuer definierte Orte, Zeiten und Körper
- Regressionstests mit versionierten Fixtures
- Version der Astronomie-Bibliothek fixieren

### Standortfehler

Ursachen:

- Nutzer gibt Koordinaten ungenau ein
- Browser-Geolocation ist abhängig von Gerät und Umgebung
- Geocoding eines Ortsnamens liefert Stadtzentrum statt tatsächlichem Standort
- PLZ kann mehrere Orte oder große Gebiete abdecken

Auswirkung:

- Azimut und Höhe können merklich abweichen.
- Beim Mond sind Standortfehler wegen Parallaxe besonders relevant.

Kontrolle:

- Koordinaten sichtbar anzeigen
- Genauigkeit der Browser-Geolocation anzeigen, wenn verfügbar
- Bei Ort-/PLZ-Suche Ergebnisliste mit Land/Region/Koordinaten anzeigen

### Höhenfehler

Ursachen:

- Keine oder ungenaue Höhe aus Geocoding
- Nutzer kennt Höhe nicht
- Höhe über Ellipsoid vs. Meereshöhe nicht immer eindeutig

Auswirkung:

- Horizontnahe Höhen und Auf-/Untergangszeiten können abweichen.
- Bei normalen Positionswerten meist kleiner als Standort- und Refraktionsfehler, aber nicht null.

Kontrolle:

- `elevationMeters` im Datenmodell führen
- Standardwert dokumentieren, wenn keine Höhe bekannt ist
- Manuelle Bearbeitung ermöglichen

### Zeitzonenfehler

Ursachen:

- Falsche IANA-Zeitzone
- Verwechslung von UTC-Offset und Zeitzone
- Historische oder zukünftige Änderungen der Zeitzonendaten

Auswirkung:

- Vollständig falsche Zeitpunkte und damit falsche Positionen.

Kontrolle:

- Keine naive Offset-Logik
- IANA-Zeitzonen verwenden
- Lokale Zeit und UTC-Zeit im Export anzeigen

### DST-Probleme

Ursachen:

- Nicht existierende lokale Uhrzeiten bei DST-Start
- Doppelte lokale Uhrzeiten bei DST-Ende
- Eingabe "02:30" kann ungültig oder mehrdeutig sein

Auswirkung:

- Falscher UTC-Instant, wenn nicht explizit behandelt.

Kontrolle:

- Temporal/ZonedDateTime verwenden
- Ungültige lokale Zeiten als Fehler anzeigen
- Doppelte lokale Zeiten mit Auswahl oder klarer Disambiguation behandeln

### Refraktion

Ursachen:

- Atmosphärische Refraktion hängt von Temperatur, Druck, Luftfeuchte und lokaler Atmosphäre ab
- Standardmodelle sind Näherungen
- Nahe Horizont wächst die Unsicherheit stark

Auswirkung:

- Apparent altitude besonders nahe Horizont unsicher.
- Auf-/Untergang stark betroffen.

Kontrolle:

- Unrefracted altitude und apparent altitude getrennt ausgeben, falls möglich
- Refraktionsmodell dokumentieren
- Druck/Temperatur entweder als Eingabe anbieten oder Standardwerte nennen
- Werte nahe Horizont gesondert testen und warnen

### Lokaler Horizont

Ursachen:

- Berge, Gebäude, Bäume und Gelände werden nicht modelliert
- Meereshorizont vs. Stadthorizont

Auswirkung:

- Sichtbarkeit und Auf-/Untergänge können in der Realität stark abweichen.

Kontrolle:

- Klarer Hinweis: lokaler Horizont wird nicht berücksichtigt
- Keine Sichtbarkeitsgarantie geben

### Rundung

Ursachen:

- UI-Formatierung mit zu vielen Nachkommastellen
- CSV/XLSX/TXT/Markdown nutzen unterschiedliche Darstellung

Auswirkung:

- Scheingenauigkeit oder scheinbare Unterschiede zwischen Exportformaten

Kontrolle:

- Intern Zahlen mit ausreichender Präzision halten
- UI standardmäßig z. B. 3 Dezimalstellen fuer Winkel anzeigen
- Export optional mit konsistenter Präzision
- README erklärt, dass Anzeigepräzision nicht Messgenauigkeit ist

### Geocoding-Unsicherheit

Ursachen:

- Mehrdeutige Ortsnamen
- PLZ kann mehrere Treffer liefern
- API-Daten können veraltet oder generalisiert sein

Auswirkung:

- Standort und Zeitzone können falsch sein

Kontrolle:

- Ergebnisliste statt blindem ersten Treffer
- Land/Region/Koordinaten/Zeitzone anzeigen
- Nutzer kann Koordinaten korrigieren

## Topozentrische Mondposition ist Pflicht

Mondparallaxe darf nicht ignoriert werden. Der Mond ist nah genug, dass geozentrische Positionen fuer einen Beobachter auf der Erdoberfläche merklich falsch sein können.

Konsequenz fuer Implementierung:

- Mond-Höhe und -Azimut müssen fuer den konkreten Beobachter berechnet werden.
- Tests müssen unterschiedliche Standorte enthalten.
- Validierung gegen JPL Horizons muss Observer-/topozentrische Tabellen nutzen, nicht nur geozentrische Werte.

## Website-Hinweistext fuer MVP

Vorschlag:

"Die Positionen werden mit einer browserfähigen astronomischen Bibliothek berechnet und gegen JPL-Horizons-Referenzdaten getestet. Die Genauigkeit hängt von Standort, Zeitpunkt, Zeitzone, Refraktionsannahmen und Rundung ab. Atmosphärische Refraktion ist eine Näherung; lokaler Horizont, Gebäude, Berge und Wetter werden nicht berücksichtigt."

## Stop-Regeln

Die Implementierung darf keine Genauigkeitsbehauptung veröffentlichen, wenn:

- keine JPL-Horizons-Fixtures erzeugt wurden;
- Target, Observer, Zeitstandard oder Refraktionsmodus der Fixtures unklar sind;
- Mondpositionen nicht topozentrisch berechnet werden;
- NREL-SPA-Code kopiert oder portiert werden müsste;
- Testtoleranzen willkürlich enger gesetzt wurden als die Daten belegen.

