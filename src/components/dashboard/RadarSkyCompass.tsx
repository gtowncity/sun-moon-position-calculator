import type { Language, ResultRow } from "../../types";
import type { Translator } from "../../i18n";
import type { TimeSample } from "../../app/insights";
import { sampleLabel } from "./utils";

interface RadarSkyCompassProps {
  focusedSample: TimeSample | null;
  language: Language;
  t: Translator;
}

export function RadarSkyCompass({ focusedSample, language, t }: RadarSkyCompassProps) {
  const bodies: Array<["sun" | "moon", ResultRow | null | undefined]> = [
    ["sun", focusedSample?.sun],
    ["moon", focusedSample?.moon]
  ];
  const east = language === "de" ? "O" : "E";

  return (
    <section className="instrument-panel radar-panel">
      <div className="terminal-section-title">[{t("skyCompass")}]</div>
      <div className="radar-time">{sampleLabel(focusedSample, t)}</div>
      <div className="compass-face radar-face" aria-label={t("skyCompass")}>
        <span className="north">N</span>
        <span className="east">{east}</span>
        <span className="south">S</span>
        <span className="west">W</span>
        <span className="azimuth-ring ring-one" />
        <span className="azimuth-ring ring-two" />
        <span className="radar-crosshair" />
        {bodies.map(([body, row]) => {
          const angle = row?.azimuthDeg ?? 0;
          const visible = Boolean(row && row.apparentAltitudeDeg > 0);
          const radius = visible ? 34 : 45;
          const x = 50 + Math.sin((angle * Math.PI) / 180) * radius;
          const y = 50 - Math.cos((angle * Math.PI) / 180) * radius;
          return (
            <span
              key={body}
              className={`compass-dot ${body} ${visible ? "" : "is-below"}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={`${t(body).toUpperCase()} AZ: ${row?.azimuthDeg.toFixed(1) ?? "-"} deg ALT: ${row?.apparentAltitudeDeg.toFixed(1) ?? "-"} deg`}
            >
              {body === "sun" ? "S" : "M"}
              <i>{row ? `${row.apparentAltitudeDeg.toFixed(0)} deg` : "-"}</i>
            </span>
          );
        })}
      </div>
    </section>
  );
}
