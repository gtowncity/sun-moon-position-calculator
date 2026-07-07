import "./Win98ShellPrototype.css";

const twilightRows = [
  ["21:29", "Sonnenuntergang"],
  ["22:17", "Buergerliche Daemmerung Ende"],
  ["23:13", "Nautische Daemmerung Ende"],
  ["--:--", "Astronomische Nacht nicht erreicht"],
  ["04:52", "Sonnenaufgang"]
];

const eventRows = [
  ["04:52", "Sonne", "Aufgang"],
  ["06:27", "Mond", "Transit"],
  ["13:11", "Sonne", "Transit"],
  ["21:29", "Sonne", "Untergang"]
];

export function Win98ShellPrototype() {
  return (
    <div className="win98-desktop">
      <section className="win98-app-window" aria-label="Sun and Moon Position Calculator visual prototype">
        <header className="win98-titlebar">
          <div className="win98-titlebar-left"><span className="win98-app-icon" aria-hidden="true" /><strong>Sun &amp; Moon Position Calculator</strong></div>
          <div className="win98-window-controls" aria-hidden="true"><button type="button">_</button><button type="button">□</button><button type="button">X</button></div>
        </header>
        <nav className="win98-menubar" aria-label="Menueleiste"><span><u>D</u>atei</span><span><u>B</u>erechnung</span><span><u>A</u>nsicht</span><span><u>W</u>erkzeuge</span><span><u>E</u>xport</span><span><u>H</u>ilfe</span></nav>
        <div className="win98-toolbar" aria-label="Werkzeugleiste"><button type="button"><span className="win98-toolbar-icon win98-icon-doc" />Neu</button><button type="button"><span className="win98-toolbar-icon win98-icon-pin" />Standort</button><button type="button"><span className="win98-toolbar-icon win98-icon-clock" />Jetzt</button><button type="button"><span className="win98-toolbar-icon win98-icon-play" />Neu berechnen</button><i aria-hidden="true" /><button type="button"><span className="win98-toolbar-icon win98-icon-disk" />Export</button><button type="button"><span className="win98-toolbar-icon win98-icon-help" />Hilfe</button></div>
        <div className="win98-addressbar"><span>Berechnung</span><div>Eine Nacht &gt; Berlin &gt; Sonne + Mond &gt; 10 Minuten &gt; Standard-Refraktion</div></div>
        <main className="win98-content">
          <section className="win98-control-strip" aria-label="Eingaben">
            <fieldset className="win98-group"><legend>Standort</legend><div className="win98-field-grid win98-two-columns"><label>Breite<input value="52.520000" readOnly /></label><label>Laenge<input value="13.405000" readOnly /></label><label>Hoehe<input value="34 m" readOnly /></label><label>Quelle<input value="Manuell" readOnly /></label></div><div className="win98-button-row"><button type="button">Aendern...</button><button type="button">GPS</button><button type="button">Ort suchen...</button></div></fieldset>
            <fieldset className="win98-group"><legend>Zeit</legend><div className="win98-field-grid"><label>Datum<input value="07.07.2026" readOnly /></label><label>Uhrzeit<input value="16:00" readOnly /></label><label>Zeitzone<select defaultValue="Europe/Berlin"><option>Europe/Berlin</option></select></label></div></fieldset>
            <fieldset className="win98-group"><legend>Ziel</legend><div className="win98-radio-list"><label><input type="radio" defaultChecked readOnly />Sonne + Mond</label><label><input type="radio" readOnly />Nur Sonne</label><label><input type="radio" readOnly />Nur Mond</label></div><select defaultValue="Eine Nacht"><option>Eine Nacht</option></select></fieldset>
            <fieldset className="win98-group"><legend>Intervall</legend><div className="win98-field-grid"><label>Start<input value="07.07.2026 16:00" readOnly /></label><label>Schritt<select defaultValue="10 Minuten"><option>10 Minuten</option></select></label></div><p>Zeilen: 218</p></fieldset>
            <aside className="win98-action-panel" aria-label="Aktion und Optionen"><div><div className="win98-action-title">Aktion</div><button type="button" className="win98-default-button">Berechnung starten</button></div><div className="win98-options-strip"><strong>Optionen:</strong><br />Refraktion Standard<br />Dezimalgrad | Deutsch<br /><button type="button">Erweitert...</button></div></aside>
          </section>
          <section className="win98-summary-zone" aria-label="Zusammenfassung">
            <article className="win98-panel win98-summary-card"><header><strong>Sonne</strong></header><div className="win98-metric-label">Aktuelle Hoehe</div><div className="win98-readout">46.13 Grad</div><dl><div><dt>Azimut</dt><dd>244.31 Grad</dd></div><div><dt>Zenit</dt><dd>43.86 Grad</dd></div><div><dt>Aufgang</dt><dd>04:52</dd></div><div><dt>Untergang</dt><dd>21:29</dd></div></dl></article>
            <article className="win98-panel win98-summary-card"><header><strong>Mond</strong></header><div className="win98-metric-label">Aktuelle Hoehe</div><div className="win98-readout">-20.31 Grad</div><span className="win98-substatus">unter Horizont</span><dl><div><dt>Azimut</dt><dd>120.54 Grad</dd></div><div><dt>Phase</dt><dd>61 Prozent</dd></div><div><dt>Transit</dt><dd>06:27</dd></div><div><dt>Distanz</dt><dd>384 200 km</dd></div></dl></article>
            <aside className="win98-panel win98-warning-panel"><span className="win98-warning-icon" aria-hidden="true">!</span><div><h3>Keine vollstaendige astronomische Nacht</h3><p>Die Sonne erreicht im gewaehlten Zeitraum keine -18 Grad.</p><button type="button">Details...</button></div></aside>
          </section>
          <section className="win98-tabs-area" aria-label="Arbeitsbereich"><div className="win98-tabs" role="tablist" aria-label="Detail-Tabs"><button type="button" className="active">Uebersicht</button><button type="button">Sonne</button><button type="button">Mond</button><button type="button">Ereignisse</button><button type="button">Tabelle</button><button type="button">Export</button><button type="button">Genauigkeit</button></div><div className="win98-tab-page"><div className="win98-tab-layout"><section className="win98-panel"><header><strong>Nachtuebersicht</strong></header><div className="win98-night-banner"><span>07.07.2026 -> 08.07.2026</span><b>0 min effektive DSO-Nacht</b></div><div className="win98-twilight-list">{twilightRows.map(([time, label]) => <div key={`${time}-${label}`}><span>{time}</span><span>{label}</span></div>)}</div></section><section className="win98-panel"><header><strong>Ereignisse</strong></header><div className="win98-table-wrap"><table className="win98-table"><thead><tr><th>Zeit</th><th>Objekt</th><th>Ereignis</th></tr></thead><tbody>{eventRows.map(([time, object, event]) => <tr key={`${time}-${object}-${event}`}><td>{time}</td><td>{object}</td><td>{event}</td></tr>)}</tbody></table></div></section></div></div></section>
        </main>
        <footer className="win98-statusbar"><span>Bereit</span><span>Standort: Berlin</span><span>Zeitzone: Europe/Berlin</span><span>Zeilen: 218</span><span>Refraktion: Standard</span><span>Engine: Astronomy</span></footer>
      </section>
    </div>
  );
}
