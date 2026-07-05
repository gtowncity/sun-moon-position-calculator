# VALIDATION PLAN

Stand: 2026-07-03

Dieses Dokument beschreibt, wie die spätere Berechnung gegen JPL Horizons validiert werden soll. Es enthält bewusst keine erfundenen Referenzwerte. Alle numerischen Referenzwerte bleiben TODO, bis sie reproduzierbar erzeugt und versioniert wurden.

## Ziel

Die Runtime-Berechnung fuer Sonne und Mond soll gegen JPL Horizons verglichen werden:

- topozentrisch fuer konkrete Beobachterstandorte
- mit dokumentiertem Zeitstandard
- mit dokumentiertem Refraktionsmodus
- mit festen Toleranzen pro Größe und Himmelskörper
- reproduzierbar über gespeicherte Query-Parameter und Fixture-Dateien

## Referenzquelle

JPL Horizons:

- API: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- Manual: https://ssd.jpl.nasa.gov/horizons/manual.html

Relevante Horizons-Fakten:

- API-Endpunkt: `https://ssd.jpl.nasa.gov/api/horizons.api`
- Observer Tables werden mit `EPHEM_TYPE='OBSERVER'` erzeugt.
- Targets: Sonne = `10`, Mond = `301`.
- Observer/Center kann als Earth-based site bzw. geodätische Koordinaten angegeben werden.
- `TIME_TYPE` fuer Observer Tables kann `UT` oder `TT` sein; fuer dieses Projekt wird `UT`/UTC-nahe Ausgabe geplant.
- `QUANTITIES` steuert Ausgabegrößen.
- `APPARENT` bzw. Table Settings müssen fuer `AIRLESS` oder `REFRACTED` dokumentiert werden.

## Horizons Targets

| Körper | Horizons Target | Bemerkung |
| --- | --- | --- |
| Sonne | `10` | Solar-system body ID |
| Mond | `301` | Lunar body ID |

Quelle fuer IDs:

- Horizons Manual listet Sun = `10`, Moon = `301`: https://ssd.jpl.nasa.gov/horizons/manual.html

## Observer/topozentrischer Standort

Für jeden Referenzfall sollen geodätische Beobachterkoordinaten verwendet werden:

- Latitude in Grad
- Longitude in Grad
- Elevation in Metern
- Erde als Beobachterkörper
- Keine geozentrische Observer-Tabelle fuer Mond-/Sonnen-Horizontwerte

Geplante Horizons-Parameter, exemplarisch:

- `EPHEM_TYPE='OBSERVER'`
- `CENTER='coord@399'` oder entsprechende Horizons-konforme Koordinatenform
- `COORD_TYPE='GEODETIC'`
- `SITE_COORD='longitude,latitude,elevation'` nach Horizons-Dokumentation verifizieren
- `TIME_TYPE='UT'`
- `CAL_FORMAT='BOTH'` oder `CAL`
- `TIME_DIGITS='SECONDS'`
- `QUANTITIES='1,2,4,20'` als zu prüfender Startpunkt

TODO:

- Exakte Horizons-Syntax fuer `CENTER='coord@399'` und `SITE_COORD` anhand einer erfolgreichen Abfrage finalisieren.
- Prüfen, ob `SITE_COORD` Höhe in km oder anderer Einheit erwartet; nicht aus Annahme implementieren.

## Ausgabegrößen

Benötigte Validierungsgrößen:

- Azimuth
- Elevation / altitude
- Right Ascension
- Declination
- Range / Distance, falls verfügbar und eindeutig

Geplante Horizons-Quantities:

| Quantity | Zweck | Status |
| --- | --- | --- |
| `1` | Astrometric RA/DEC | Prüfen, ob passend zur Runtime |
| `2` | Apparent RA/DEC | Wahrscheinlich relevanter fuer Anzeige |
| `4` | Apparent azimuth/elevation | Zentral fuer horizontale Positionen |
| `20` | Range und range-rate | Für Distanz prüfen |

TODO:

- Quantity-Liste in einer Probeabfrage validieren.
- Entscheiden, ob RA/DEC als astrometric oder apparent angezeigt werden soll.
- Dokumentieren, ob RA in Stunden oder Grad gespeichert/exportiert wird.

## Refraktion

Zwei Validierungsmodi sind geplant:

1. Airless / unrefracted
2. Refracted / apparent, sofern die Runtime dieselbe oder vergleichbare Refraktion unterstützt

Regel:

- Toleranzen fuer unrefracted altitude und refracted apparent altitude getrennt.
- Horizontnahe Fälle separat markieren.
- Wenn Runtime-Refraktionsmodell und Horizons-Refraktion nicht identisch sind, darf kein enger Vergleich nahe Horizont erzwungen werden.

TODO:

- Horizons-Parameter fuer `APPARENT='AIRLESS'` und `APPARENT='REFRACTED'` in konkreten API-Abfragen testen.
- Runtime-Refraktionsmodell von Astronomy Engine dokumentieren.

## Zeitstandard

Projektintern:

- Nutzer gibt lokale Kalenderzeit + IANA-Zeitzone ein.
- App erzeugt daraus einen eindeutigen UTC-Instant.
- Runtime bekommt UTC/Instant.
- Export enthält lokale Zeit, Zeitzone und UTC-Zeit.

Horizons:

- Validierungsabfragen verwenden UTC/UT-Zeitpunkte.
- Alle Query-Zeiten werden als UTC dokumentiert.
- DST wird nicht in Horizons versteckt, sondern bereits vorher durch Temporal in UTC aufgelöst.

TODO:

- Prüfen, ob Horizons-Ausgabe `UT` oder `UTC` benennt und wie Leap-Second-Hinweise in Fixture-Metadaten dokumentiert werden.

## Koordinatensystem

Horizontwerte:

- Topozentrisch
- Azimuth in Grad
- Elevation/altitude in Grad
- Azimut-Konvention von Horizons dokumentieren, insbesondere Nullrichtung und Zählrichtung

Äquatorwerte:

- ICRF oder true equator/equinox of-date je nach gewählter Quantity
- Runtime-Ausgabe exakt darauf abstimmen oder getrennt benennen

TODO:

- Horizons-Konventionen aus Manual in Fixture-Metadaten aufnehmen.
- Runtime-Koordinatensysteme von Astronomy Engine den Ausgabespalten zuordnen.

## Referenzstandorte

Vorläufige Standorte:

| Name | Zweck | Koordinatenstatus |
| --- | --- | --- |
| Berlin | Mitteleuropa, DST, moderater Breitengrad | TODO: exakte Koordinaten festlegen |
| New York | USA, andere Zeitzone/DST | TODO |
| Sydney | Südhalbkugel, DST-Fall prüfen | TODO |
| Quito oder Äquatornähe | Äquatornahe Geometrie | TODO |
| Tromsø oder hoher Breitengrad | hohe Breite, extreme Sonnenstände | TODO |
| UTC-Referenzort | Zeitzonenunabhängiger Test | TODO |

Regel:

- Koordinaten werden nicht aus dem Gedächtnis in Fixtures geschrieben.
- Für Validierung werden feste lat/lon/elevation-Werte mit Quelle dokumentiert.

## Referenzzeiten

Geplante Fallgruppen:

- Sommerzeitfall
- Winterzeitfall
- DST-Start mit ungültiger lokaler Uhrzeit
- DST-Ende mit doppelter lokaler Uhrzeit
- Tagundnachtgleiche
- Sonnenwende Juni
- Sonnenwende Dezember
- Mond nahe Vollmond
- Mond nahe Neumond
- Mond nahe Horizont
- Sonne nahe Horizont
- Sonne/Mond hoch am Himmel

TODO:

- Konkrete UTC-Zeitpunkte festlegen.
- Mondphasenzeitpunkte über Astronomy Engine oder externe Quelle vorschlagen und danach gegen Horizons validieren.
- Keine Referenzwerte eintragen, bevor Horizons-Abfragen durchgeführt wurden.

## Fixture-Format

Geplante Struktur fuer spätere Testdaten:

```json
{
  "metadata": {
    "source": "JPL Horizons",
    "generatedAt": "TODO",
    "apiVersion": "TODO",
    "queryUrl": "TODO",
    "target": "10 or 301",
    "body": "sun or moon",
    "observer": {
      "name": "Berlin",
      "latitudeDeg": "TODO",
      "longitudeDeg": "TODO",
      "elevationMeters": "TODO"
    },
    "timeStandard": "UT/UTC TODO",
    "refraction": "AIRLESS or REFRACTED",
    "quantities": ["TODO"]
  },
  "rows": [
    {
      "utcTime": "TODO",
      "azimuthDeg": "TODO",
      "altitudeDeg": "TODO",
      "rightAscension": "TODO",
      "declinationDeg": "TODO",
      "distanceKm": "TODO"
    }
  ]
}
```

Keine numerischen TODOs dürfen in Tests als echte Referenzwerte genutzt werden.

## Testtoleranzen

Vorläufig:

- Sonne Azimut/Höhe airless: <= 0,05 Grad
- Sonne Höhe refracted: <= 0,10 Grad
- Mond Azimut/Höhe airless: <= 0,10 Grad
- Mond Höhe refracted: <= 0,15 Grad
- Horizontnahe Werte: separat labeln und ggf. breitere Toleranz oder nur airless vergleichen

Diese Werte sind Startpunkte. Sie werden nach ersten Fixture-Vergleichen angepasst.

## Validierungsworkflow

1. Standortliste finalisieren.
2. UTC-Zeitpunkte finalisieren.
3. Horizons-Query-Template fuer Sonne airless erzeugen.
4. Horizons-Query-Template fuer Mond airless erzeugen.
5. Refracted-Modus separat erzeugen.
6. JSON- oder Textausgabe parsen und als Rohdatei speichern.
7. Normalisierte Fixture-Dateien erzeugen.
8. Query-URLs und Metadaten in Fixtures speichern.
9. Tests gegen Runtime schreiben.
10. Toleranzen anhand der Ergebnisse überprüfen.
11. README-Genauigkeitsaussage erst nach erfolgreichen Tests finalisieren.

## Stop-Regeln

Nicht validieren oder veröffentlichen, wenn:

- Horizons Target falsch oder mehrdeutig ist;
- Observer nicht topozentrisch ist;
- Refraktionsmodus unbekannt ist;
- Zeitstandard unbekannt ist;
- Koordinatensystem fuer RA/DEC nicht dokumentiert ist;
- Referenzwerte manuell geraten wurden;
- Parser stillschweigend `n.a.` oder fehlende Werte akzeptiert.

