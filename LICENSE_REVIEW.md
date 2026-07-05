# LICENSE REVIEW

Stand: 2026-07-03

Dies ist keine Rechtsberatung. Das Dokument bewertet technische Lizenzrisiken fuer ein öffentliches GitHub-Webtool. Vor einer produktiven Veröffentlichung sollte die endgültige Abhängigkeitsliste erneut geprüft werden.

## Zusammenfassung

| Komponente | Zweck | Vorläufige Kategorie | Entscheidung |
| --- | --- | --- | --- |
| Astronomy Engine | Runtime-Ephemeriden Sonne/Mond | OK | Für MVP empfohlen |
| `@js-temporal/polyfill` | Zeitzonen/DST/Temporal | OK | Empfohlen, solange Temporal nicht überall nativ verfügbar ist |
| SheetJS CE / `xlsx` | XLSX-Export | Prüfen | Wahrscheinlich OK, Bezugsweg und Bundlegröße prüfen |
| ExcelJS | XLSX-Export | OK | MIT; Browser-Build im MVP erfolgreich geprüft |
| Open-Meteo Geocoding | Ort-/PLZ-Suche | Prüfen | Für nicht-kommerzielle Nutzung OK; Terms beachten |
| NREL SPA offizieller Code | Sonnenalgorithmus | Vermeiden | Nicht kopieren, nicht portieren, nicht redistribuieren |
| NREL SPA Publikation/Methode | wissenschaftliche Referenz | Prüfen/OK als Referenz | Als Quelle nutzbar, Codeübernahme verboten |
| Meeus-basierte Bibliotheken | Alternative Algorithmen | Prüfen | Nur mit sauberer Lizenz und Validierung |
| Unklare NREL-SPA-NPM-Ports | vermeintlich präzise Solar-Module | Vermeiden | Herkunft und Ableitung oft kritisch |

## Astronomy Engine

Quelle:

- https://github.com/cosinekitty/astronomy

Lizenzlage:

- Das Repository ist als MIT-lizenziert ausgewiesen.
- Es unterstützt JavaScript/TypeScript bzw. Browser-Use-Cases und nennt eine Zielgenauigkeit von etwa +/- 1 arcminute.
- Die README beschreibt Tests gegen NOVAS, JPL Horizons und andere Referenzen.

Bewertung: OK.

Auflagen:

- MIT-Lizenztext im finalen Projekt bzw. in Third-Party Notices beibehalten.
- Keine Genauigkeitsaussagen über die dokumentierte Bibliotheksgenauigkeit hinaus ohne eigene Validierung.
- Bibliotheksversion im späteren `package-lock`/`pnpm-lock` fixieren.

## `@js-temporal/polyfill`

Quellen:

- https://www.npmjs.com/package/@js-temporal/polyfill
- https://app.unpkg.com/%40js-temporal/polyfill%400.4.3/files/package.json
- https://app.unpkg.com/%40js-temporal/polyfill%400.4.3/files/LICENSE
- Temporal Docs: https://tc39.es/proposal-temporal/docs/

Lizenzlage:

- Das Paket ist in den geprüften Paketdaten als ISC-lizenziert ausgewiesen.
- Die Lizenz ist permissiv und fuer ein öffentliches Open-Source-Webtool grundsätzlich geeignet.

Bewertung: OK.

Auflagen:

- Lizenzhinweis in Third-Party Notices aufnehmen.
- Browser-Support beobachten: Falls Temporal nativ breit genug verfügbar ist, kann der Polyfill später optional werden.

## SheetJS CE / `xlsx`

Quellen:

- SheetJS GitHub-Spiegel: https://github.com/SheetJS/sheetjs
- SheetJS CDN: https://cdn.sheetjs.com/

Lizenzlage:

- SheetJS CE wird als Apache-2.0-lizenziert beschrieben.
- Der GitHub-Spiegel verweist darauf, dass der aktive Source-Standort auf `git.sheetjs.com` liegt.
- NPM-Paketlage und aktueller empfohlener Installationsweg müssen vor Implementierung geprüft werden, da SheetJS CE zeitweise nicht wie übliche NPM-Pakete aktualisiert wurde.

Bewertung: Prüfen.

Vorteile:

- Reife XLSX-Erzeugung im Browser.
- Apache-2.0 ist grundsätzlich permissiv.

Risiken:

- Bezugsweg, Versionierung und Supply-Chain-Pflege prüfen.
- Bundlegröße prüfen.
- Apache-2.0-Hinweise und NOTICE-Pflichten beachten.

Empfehlung:

- Für MVP wahrscheinlich geeignet, wenn der konkrete Installationsweg sauber ist.
- Alternative ExcelJS parallel prüfen.

## ExcelJS

Quelle:

- https://github.com/exceljs/exceljs

Lizenzlage:

- Das Repository ist als MIT-lizenziert ausgewiesen.

Bewertung: OK.

Vorteile:

- MIT-Lizenz.
- Echte Workbook-/Worksheet-Erzeugung.

Risiken:

- Browser-Bundle ist größer als die frühere App ohne XLSX.
- ExcelJS bringt transitive Abhängigkeiten mit; `npm audit` wird vor Veröffentlichung geprüft.

Empfehlung:

- Für den MVP verwendet, weil der Browser-Build funktioniert und echte `.xlsx`-Workbooks mit Sheets, Tabellen, Stilen und Bildern erzeugt.

## Open-Meteo Geocoding

Quellen:

- Geocoding API: https://open-meteo.com/en/docs/geocoding-api
- Terms: https://open-meteo.com/en/terms
- License: https://open-meteo.com/en/licence

API-Funktionalität:

- Suche per Ortsname oder Postleitzahl.
- Parameter `language`, `count`, `countryCode`.
- Ergebnisse enthalten u. a. `latitude`, `longitude`, `elevation`, `timezone`, `country`, `admin`-Felder und Postcodes.

Lizenz-/Nutzungsbedingungen:

- Die freie API ist laut Terms auf nicht-kommerzielle Nutzung beschränkt.
- Limits laut Terms: 10.000 Calls/Tag, 5.000 Calls/Stunde, 600 Calls/Minute.
- API-Daten sind unter CC BY 4.0 beschrieben; freie API-Nutzung bleibt dennoch nicht-kommerziell.
- Logs können laut Open-Meteo Terms Koordinaten enthalten und bis zu 90 Tage gespeichert werden.

Bewertung: Prüfen.

Empfehlung:

- Für ein nicht-kommerzielles öffentliches MVP geeignet, wenn Attribution und Terms dokumentiert werden.
- Geocoding-Provider austauschbar kapseln.
- Im README und UI klar dokumentieren, dass Ortssuche einen Drittanbieter aufruft.
- Für kommerzielle Nutzung bezahlten Plan, Self-Hosting oder alternativen Provider vorsehen.

## NREL SPA offizieller Code

Quelle:

- https://midcdmz.nlr.gov/spa/

Technische Angaben:

- Zeitraum: Jahr -2000 bis 6000.
- Angegebene Unsicherheit: +/- 0.0003 Grad fuer Sonnenzenit und Azimut abhängig von Datum, Zeit und Ort.

Lizenzlage:

- Die offizielle Seite enthält Copyright-Hinweise.
- Die Software wird für interne, nicht-kommerzielle Zwecke bereitgestellt.
- Die Software darf nicht weiterverteilt werden.
- Für kommerzielle Lizenz wird ein Kontakt zur Technology Transfer Office genannt.

Bewertung: Vermeiden.

Konsequenz:

- Offiziellen NREL-SPA-Code nicht in dieses Repository aufnehmen.
- Offiziellen Code nicht nach TypeScript/JavaScript portieren.
- Keine abgeleiteten Dateien, Tabellen oder testnah kopierten Strukturen aus `spa.c`/`spa.h` verwenden.
- NPM-Pakete, die NREL SPA implementieren, nur verwenden, wenn Herkunft und Lizenz vollständig geprüft sind; bis dahin vermeiden.

## NREL SPA Publikation und Methode

Quellen:

- Reda, I.; Andreas, A. "Solar Position Algorithm for Solar Radiation Applications"
- NREL/NLR SPA-Seite: https://midcdmz.nlr.gov/spa/

Bewertung: Prüfen/OK als Referenz.

Zulässige Nutzung:

- Publikation und technische Beschreibung lesen.
- Genauigkeitsangaben korrekt zitieren.
- Algorithmische Konzepte wissenschaftlich diskutieren.
- Gegen SPA-Referenzwerte validieren, sofern Referenzwerte legal erzeugt oder aus Publikation übernommen werden dürfen.

Nicht zulässig ohne separate Freigabe:

- Code kopieren.
- Code portieren.
- Tabellen oder Konstanten aus dem Code übernehmen, wenn sie nicht unabhängig aus publizierten Quellen stammen.
- Den offiziellen NREL-Code über GitHub weiterverteilen.

## Meeus-basierte Bibliotheken

Beispiele:

- Bibliotheken, die Jean Meeus' "Astronomical Algorithms" implementieren.
- Solar-/Moon-Position-Pakete mit MIT, BSD, GPL oder unklaren Lizenzen.

Bewertung: Prüfen.

Risiken:

- "Meeus-basiert" sagt noch nichts über Genauigkeit, topozentrische Mondkorrektur oder Refraktion aus.
- Viele kleine Bibliotheken verwenden vereinfachte Formeln, die fuer den Mond nahe Horizont ungeeignet sein können.
- GPL-Abhängigkeiten können fuer ein permissives Webtool unerwünscht sein.
- Buchformeln sind urheberrechtlich anders zu bewerten als Implementierungen; Code muss eigenständig sein.

Empfehlung:

- Für MVP keine zusätzliche Meeus-Bibliothek verwenden.
- Wenn später ein eigenes Modul gebaut wird, vorher separate Lizenz- und Validierungsprüfung erstellen.

## Lizenz-Stop-Regeln

Nicht implementieren, wenn:

- eine Abhängigkeit keine klare Lizenz hat;
- ein Paket NREL-SPA-Code kopiert oder portiert und die Weiterverteilung nicht eindeutig erlaubt ist;
- kommerzielle API-Bedingungen mit dem Deployment-Ziel kollidieren;
- Third-Party-Lizenztexte nicht dokumentiert werden können;
- Referenzdaten nicht reproduzierbar erzeugt oder sauber zitiert werden können.

## Vorläufige Abhängigkeitsentscheidung

Für die spätere MVP-Implementierung:

- OK: Astronomy Engine
- OK: `@js-temporal/polyfill`
- Prüfen: SheetJS CE oder ExcelJS
- Prüfen: Open-Meteo Geocoding
- Vermeiden: offizieller NREL-SPA-Code und unklare NREL-SPA-Ports
