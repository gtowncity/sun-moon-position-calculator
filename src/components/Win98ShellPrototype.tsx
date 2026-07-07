import "./Win98ShellPrototype.css";

const twilightRows = [
  ["21:29", "Sonnenuntergang"],
  ["22:17", "Bürgerliche Dämmerung Ende"],
  ["23:13", "Nautische Dämmerung Ende"],
  ["--:--", "Astronomische Nacht nicht erreicht"],
  ["04:05", "Bürgerliche Dämmerung Beginn"],
  ["04:52", "Sonnenaufgang"]
];

const eventRows = [
  ["04:52", "Sonne", "Aufgang"],
  ["06:27", "Mond", "Transit / Kulmination"],
  ["13:11", "Sonne", "Transit"],
  ["21:29", "Sonne", "Untergang"]
];

const resultRows = [
  ["1", "Sonne", "2026-07-07", "16:00", "244.31°", "46.13°", "43.86°"],
  ["2", "Mond", "2026-07-07", "16:00", "120.54°", "-20.31°", "110.31°"],
  ["3", "Sonne", "2026-07-07", "16:10", "246.03°", "44.75°", "45.24°"],
  ["4", "Mond", "2026-07-07", "16:10", "123.12°", "-19.72°", "109.72°"]
];

export function Win98ShellPrototype() {
  return (
    <div className="win98-desktop">
      <section className="win98-app-window" aria-label="Sun and Moon Position Calculator visual prototype">
        <header className="win98-titlebar">
          <div className="win98-titlebar-left">
            <span className="win98-app-icon" aria-hidden="true">☀</span>
            <strong>Sun &amp; Moon Position Calculator</strong>
          </div>
          <div className="win98-window-controls" aria-hidden="true">
            <button type="button">_</button>
            <button type="button">□</button>
            <button type="button">×</button>
          </div>
        </header>

        <nav className="win98-menubar" aria-label="Menüleiste">
          <span>Datei</span>
          <span>Berechnung</span>
          <span>Ansicht</span>
          <span>Werkzeuge</span>
          <span>Export</span>
          <span>Hilfe</span>
        </nav>

        <div className="win98-toolbar" aria-label="Werkzeugleiste">
          <button type="button"><span className="win98-toolbar-icon win98-icon-doc" aria-hidden="true" />Neu</button>
          <button type="button"><span className="win98-toolbar-icon win98-icon-pin" aria-hidden="true" />Standort</button>
          <button type="button"><span className="win98-toolbar-icon win98-icon-clock" aria-hidden="true" />Jetzt</button>
          <button type="button" className="win98-primary-button"><span className="win98-toolbar-icon win98-icon-play" aria-hidden="true" />Berechnen</button>
          <i aria-hidden="true" />
          <button type="button"><span className="win98-toolbar-icon win98-icon-disk" aria-hidden="true" />Export</button>
          <button type="button"><span className="win98-toolbar-icon win98-icon-help" aria-hidden="true" />Hilfe</button>
        </div>

        <div className="win98-addressbar">
          <span>Adresse</span>
          <div>sunmoon://berechnung/eine-nacht?ort=Berlin&amp;datum=2026-07-07&amp;ziel=sonne-mond</div>
        </div>

        <main className="win98-content">
          <section className="win98-control-strip" aria-label="Eingaben">
            <fieldset className="win98-group win98-location-group">
              <legend>Standort</legend>
              <div className="win98-field-grid win98-two-columns">
                <label>Breite<input value="52.520000" readOnly /></label>
                <label>Länge<input value="13.405000" readOnly /></label>
                <label>Höhe<input value="34 m" readOnly /></label>
                <label>Quelle<input value="Manuell" readOnly /></label>
              </div>
              <div className="win98-button-row">
                <button type="button">Ändern...</button>
                <button type="button">GPS</button>
                <button type="button">Ort suchen...</button>
              </div>
            </fieldset>

            <fieldset className="win98-group">
              <legend>Zeit</legend>
              <div className="win98-field-grid">
                <label>Datum<input value="07.07.2026" readOnly /></label>
                <label>Uhrzeit<input value="16:00" readOnly /></label>
                <label>Zeitzone<select defaultValue="Europe/Berlin"><option>Europe/Berlin</option></select></label>
              </div>
              <div className="win98-button-row"><button type="button">Aktuelle Zeit</button></div>
            </fieldset>

            <fieldset className="win98-group">
              <legend>Berechnung</legend>
              <div className="win98-radio-list">
                <label><input type="radio" checked readOnly />Sonne + Mond</label>
                <label><input type="radio" readOnly />Nur Sonne</label>
                <label><input type="radio" readOnly />Nur Mond</label>
              </div>
              <select defaultValue="Eine Nacht"><option>Eine Nacht</option></select>
            </fieldset>

            <fieldset className="win98-group">
              <legend>Intervall</legend>
              <div className="win98-field-grid">
                <label>Start<input value="07.07.2026 16:00" readOnly /></label>
                <label>Ende<input value="08.07.2026 10:00" readOnly /></label>
                <label>Schritt<select defaultValue="10 Minuten"><option>10 Minuten</option></select></label>
              </div>
              <p>Geschätzte Zeilen: 218</p>
            </fieldset>

            <fieldset className="win98-group">
              <legend>Optionen</legend>
              <div className="win98-field-grid">
                <label>Sprache<select defaultValue="Deutsch"><option>Deutsch</option></select></label>
                <label>Refraktion<select defaultValue="Standard"><option>Standard</option></select></label>
                <label>Gradformat<select defaultValue="Dezimalgrad"><option>Dezimalgrad</option></select></label>
              </div>
              <div className="win98-button-row"><button type="button">Erweitert...</button></div>
            </fieldset>
          </section>

          <section className="win98-summary-zone" aria-label="Zusammenfassung">
            <article className="win98-panel win98-summary-card">
              <header><span aria-hidden="true">☀</span><strong>Sonne</strong></header>
              <div className="win98-readout">46.13°</div>
              <dl>
                <div><dt>Azimut</dt><dd>244.31°</dd></div>
                <div><dt>Zenit</dt><dd>43.86°</dd></div>
                <div><dt>Aufgang</dt><dd>04:52</dd></div>
                <div><dt>Untergang</dt><dd>21:29</dd></div>
              </dl>
            </article>

            <article className="win98-panel win98-summary-card">
              <header><span aria-hidden="true">☾</span><strong>Mond</strong></header>
              <div className="win98-readout">-20.31°</div>
              <dl>
                <div><dt>Azimut</dt><dd>120.54°</dd></div>
                <div><dt>Phase</dt><dd>61 %</dd></div>
                <div><dt>Transit</dt><dd>06:27</dd></div>
                <div><dt>Distanz</dt><dd>384 200 km</dd></div>
              </dl>
            </article>

            <aside className="win98-panel win98-notes-panel">
              <header><strong>Hinweise</strong></header>
              <ul>
                <li>Die Sonne erreicht im gewählten Zeitraum keine -18°.</li>
                <li>Mond aktuell unter dem mathematischen Horizont.</li>
                <li>Export enthält lokale Zeit und UTC.</li>
              </ul>
            </aside>
          </section>

          <section className="win98-tabs-area" aria-label="Arbeitsbereich">
            <div className="win98-tabs" role="tablist" aria-label="Detail-Tabs">
              <button type="button" className="active">Übersicht</button>
              <button type="button">Ereignisse</button>
              <button type="button">Sonne</button>
              <button type="button">Mond</button>
              <button type="button">Tabelle</button>
              <button type="button">Export</button>
              <button type="button">Genauigkeit</button>
            </div>

            <div className="win98-tab-page">
              <div className="win98-tab-layout">
                <section className="win98-panel">
                  <header><strong>Nachtübersicht</strong></header>
                  <div className="win98-night-banner">
                    <span>07.07.2026 → 08.07.2026</span>
                    <b>0 min effektive DSO-Nacht</b>
                  </div>
                  <div className="win98-twilight-list">
                    {twilightRows.map(([time, label]) => (
                      <div key={`${time}-${label}`}><span>{time}</span><span>{label}</span></div>
                    ))}
                  </div>
                </section>

                <section className="win98-panel">
                  <header><strong>Ereignisse</strong></header>
                  <table className="win98-table win98-compact-table">
                    <thead><tr><th>Zeit</th><th>Objekt</th><th>Ereignis</th></tr></thead>
                    <tbody>
                      {eventRows.map(([time, object, event]) => (
                        <tr key={`${time}-${object}-${event}`}><td>{time}</td><td>{object}</td><td>{event}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>

              <section className="win98-panel win98-table-panel">
                <header>
                  <strong>Ergebnis-Datensatz</strong>
                  <span>Platzhalterdaten / noch nicht funktional verdrahtet</span>
                </header>
                <table className="win98-table">
                  <thead><tr><th>Index</th><th>Objekt</th><th>Datum</th><th>Zeit</th><th>Azimut</th><th>Höhe app.</th><th>Zenit</th></tr></thead>
                  <tbody>
                    {resultRows.map(([index, object, date, time, azimuth, altitude, zenith]) => (
                      <tr key={`${index}-${object}`}><td>{index}</td><td>{object}</td><td>{date}</td><td>{time}</td><td>{azimuth}</td><td>{altitude}</td><td>{zenith}</td></tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          </section>
        </main>

        <footer className="win98-statusbar">
          <span>Bereit</span>
          <span>Standort: Berlin</span>
          <span>Zeitzone: Europe/Berlin</span>
          <span>Zeilen: 218</span>
          <span>Algorithmus: Astronomy Engine</span>
        </footer>
      </section>
    </div>
  );
}
