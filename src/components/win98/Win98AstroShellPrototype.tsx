import { Win98GroupBox, Win98MenuBar, Win98StatusBar, Win98TitleBar, Win98Toolbar, Win98Window } from "./Win98Shell";

export function Win98AstroShellPrototype() {
  return (
    <main className="win98-desktop-prototype">
      <Win98Window className="win98-astro-app">
        <Win98TitleBar title="SunMoon.exe" />
        <Win98MenuBar items={["File", "Analyze", "View", "Export", "Help"]} />
        <Win98Toolbar items={["Calculate", "Pause", "Reset", "GPS", "Export"]} />
        <div className="win98-top-status">
          <span>READY</span>
          <span>Location: Geiselhoering</span>
          <span>Europe/Berlin</span>
          <span>One night</span>
        </div>
        <section className="win98-astro-grid">
          <Win98GroupBox title="Input" className="win98-control-box">
            <label>Mode<select defaultValue="night"><option value="night">One night</option></select></label>
            <label>Night date<input type="date" defaultValue="2026-07-05" /></label>
            <label>Location<input defaultValue="Geiselhoering" /></label>
            <label>Imaging mode<select defaultValue="strict"><option value="strict">DSO strict (-18 deg)</option></select></label>
            <button type="button">Analyze night</button>
          </Win98GroupBox>
          <Win98GroupBox title="Astro night analysis" className="win98-hero-box">
            <p>Night: 2026-07-05 to 2026-07-06</p>
            <strong className="win98-big-result">00:14-03:08</strong>
            <p>2 h 54 min usable</p>
            <p>1 h 46 min true astronomical night</p>
          </Win98GroupBox>
          <Win98GroupBox title="Result" className="win98-result-box">
            <strong>GOOD</strong>
            <dl>
              <dt>Sunset</dt><dd>21:18</dd>
              <dt>-12 deg</dt><dd>23:02</dd>
              <dt>-18 deg start</dt><dd>00:14</dd>
              <dt>-18 deg end</dt><dd>03:08</dd>
            </dl>
          </Win98GroupBox>
          <Win98GroupBox title="Night timeline" className="win98-timeline-box">
            <div className="win98-crt-strip">20:00 | -6 | -12 | [ ASTRONOMICAL NIGHT ] | 05:00</div>
          </Win98GroupBox>
          <Win98GroupBox title="Altitude CRT Scope" className="win98-scope-box">
            <div className="win98-crt-screen">SUN / MOON ALTITUDE CURVE</div>
          </Win98GroupBox>
          <Win98GroupBox title="Radar compass" className="win98-radar-box">
            <div className="win98-radar">N<br />E + W<br />S</div>
          </Win98GroupBox>
          <Win98GroupBox title="Multi-night database" className="win98-table-box">
            <table><thead><tr><th>Night</th><th>Quality</th><th>Astro time</th><th>Best window</th></tr></thead><tbody><tr><td>05-06 Jul</td><td>Good</td><td>2:54 h</td><td>00:14-03:08</td></tr></tbody></table>
          </Win98GroupBox>
        </section>
        <Win98StatusBar items={["Ready", "Rows: 218", "Export: XLSX / TXT / Markdown"]} />
      </Win98Window>
    </main>
  );
}
