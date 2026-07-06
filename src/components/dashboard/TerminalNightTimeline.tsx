import type { EventResult } from "../../types";
import type { TranslationKey, Translator } from "../../i18n";
import type { DashboardInsight, TimeSample } from "../../app/insights";
import { eventMatchesSample, nearestSampleByPercent } from "../../app/insights";
import { formatEventKind } from "../../lib/export/columns";
import { activeRecommendation, classForSample, samplesForNight } from "./utils";

interface TerminalNightTimelineProps {
  insight: DashboardInsight;
  events: EventResult[];
  focusedSample: TimeSample | null;
  onFocusUtc: (utcTime: string | null) => void;
  onHoverUtc: (utcTime: string | null) => void;
  t: Translator;
}

export function TerminalNightTimeline({ insight, events, focusedSample, onFocusUtc, onHoverUtc, t }: TerminalNightTimelineProps) {
  const samples = samplesForNight(insight);
  const summary = insight.nightSummary;

  return (
    <section className="terminal-timeline-panel" id="night-timeline">
      <div className="terminal-section-title">[{t("nightTimeline")}]</div>
      <div className="timeline-scale" aria-hidden="true">
        {samples.filter((_, index) => index % Math.max(1, Math.ceil(samples.length / 9)) === 0).map((sample) => (
          <span key={sample.utcTime}>{sample.localTime.slice(0, 5)}</span>
        ))}
      </div>
      <div className="phase-band terminal-phase-band" aria-hidden="true">
        {summary?.segments.map((segment) => (
          <span key={`${segment.startUtc}-${segment.darknessClass}`} className={segment.darknessClass} style={{ flexGrow: Math.max(1, segment.durationMinutes) }}>
            {segment.darknessClass === "astronomical_night" ? t("astronomicalNight") : ""}
          </span>
        ))}
      </div>
      <div
        className="terminal-timeline-track"
        role="list"
        aria-label={t("nightTimeline")}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const sample = nearestSampleByPercent(samples, (event.clientX - rect.left) / rect.width);
          onHoverUtc(sample?.utcTime ?? null);
        }}
        onMouseLeave={() => onHoverUtc(null)}
      >
        {samples.map((sample) => {
          const eventHere = events.find((event) => eventMatchesSample(event, sample));
          const darknessClass = classForSample(sample);
          const usefulness = activeRecommendation(sample, t);
          const title = `TIME: ${sample.localTime.slice(0, 5)} | SUN: ${sample.sun?.geometricAltitudeDeg.toFixed(1) ?? "-"} deg | MOON: ${sample.moon?.apparentAltitudeDeg.toFixed(1) ?? "-"} deg | CLASS: ${usefulness}`;
          return (
            <button
              type="button"
              role="listitem"
              key={sample.utcTime}
              className={`timeline-sample terminal-sample ${sample.quality} ${darknessClass} ${focusedSample?.utcTime === sample.utcTime ? "is-focused" : ""}`}
              onClick={() => onFocusUtc(sample.utcTime)}
              title={title}
            >
              <span>{sample.localTime.slice(0, 5)}</span>
              <b>{sample.sun?.geometricAltitudeDeg.toFixed(0) ?? "-"} deg</b>
              <small>{t(`imagingUsefulness_${classForSample(sample) === "astronomical_night" ? "excellent" : "limited"}` as TranslationKey)}</small>
              {eventHere && <i>{formatEventKind(eventHere.kind, t)}</i>}
            </button>
          );
        })}
      </div>
      <div className="twilight-legend">
        <span>-6 deg {t("civilTwilight")}</span>
        <span>-12 deg {t("nauticalTwilight")}</span>
        <span>-18 deg {t("astronomicalNight")}</span>
      </div>
    </section>
  );
}
