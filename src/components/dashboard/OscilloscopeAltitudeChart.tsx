import type { PointerEvent } from "react";
import type { Translator } from "../../i18n";
import type { DashboardInsight, TimeSample } from "../../app/insights";
import { nearestSampleByPercent } from "../../app/insights";
import { activeRecommendation, formatAltitude, percentForUtc, sampleLabel, samplesForNight } from "./utils";

interface OscilloscopeAltitudeChartProps {
  insight: DashboardInsight;
  focusedSample: TimeSample | null;
  hoveredSample: TimeSample | null;
  onFocusUtc: (utcTime: string | null) => void;
  onHoverUtc: (utcTime: string | null) => void;
  t: Translator;
}

function chartY(altitude: number): number {
  return 100 - ((Math.max(-30, Math.min(60, altitude)) + 30) / 90) * 100;
}

function chartPoints(samples: TimeSample[], body: "sun" | "moon"): string {
  return samples
    .map((sample, index) => {
      const row = sample[body];
      const x = samples.length === 1 ? 0 : (index / (samples.length - 1)) * 100;
      const altitude = row?.apparentAltitudeDeg ?? -30;
      return `${x},${chartY(altitude)}`;
    })
    .join(" ");
}

function chartMarkers(samples: TimeSample[], body: "sun" | "moon") {
  const step = Math.max(1, Math.ceil(samples.length / 18));
  return samples
    .filter((_, index) => index % step === 0)
    .map((sample, index) => {
      const row = sample[body];
      const sourceIndex = index * step;
      const x = samples.length === 1 ? 0 : (sourceIndex / (samples.length - 1)) * 100;
      const altitude = row?.apparentAltitudeDeg ?? -30;
      return <circle key={`${body}-${sample.utcTime}`} cx={x} cy={chartY(altitude)} r="1.2" className={`${body}-marker`} />;
    });
}

export function OscilloscopeAltitudeChart({ insight, focusedSample, hoveredSample, onFocusUtc, onHoverUtc, t }: OscilloscopeAltitudeChartProps) {
  const samples = samplesForNight(insight);
  const activeSample = hoveredSample ?? focusedSample;
  const effective = insight.nightSummary?.effectiveWindow;
  const bandStart = effective ? percentForUtc(samples, effective.startUtc) : null;
  const bandEnd = effective ? percentForUtc(samples, effective.endUtc) : null;

  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const sample = nearestSampleByPercent(samples, (event.clientX - rect.left) / rect.width);
    onHoverUtc(sample?.utcTime ?? null);
  }

  return (
    <section className="instrument-panel scope-panel">
      <div className="terminal-section-title">[{t("altitudeChart")}]</div>
      <svg className="altitude-chart oscilloscope-chart" viewBox="0 0 100 100" role="img" aria-label={t("altitudeChart")} onPointerMove={handlePointer} onPointerLeave={() => onHoverUtc(null)} onClick={() => activeSample && onFocusUtc(activeSample.utcTime)}>
        <defs>
          <pattern id="scope-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" className="scope-grid-line" />
          </pattern>
        </defs>
        <rect width="100" height="100" className="scope-bg" />
        <rect width="100" height="100" fill="url(#scope-grid)" />
        {bandStart !== null && bandEnd !== null && <rect x={bandStart} y="0" width={Math.max(0, bandEnd - bandStart)} height="100" className="best-window-band" />}
        {[0, -6, -12, -18].map((threshold) => (
          <g key={threshold}>
            <line x1="0" y1={chartY(threshold)} x2="100" y2={chartY(threshold)} className={threshold === 0 ? "horizon-line" : "twilight-line"} />
            <text x="1" y={Math.max(5, chartY(threshold) - 1)}>{threshold} deg</text>
          </g>
        ))}
        <polyline points={chartPoints(samples, "sun")} className="sun-line" />
        <polyline points={chartPoints(samples, "moon")} className="moon-line" />
        {chartMarkers(samples, "sun")}
        {chartMarkers(samples, "moon")}
        {activeSample && <line x1={percentForUtc(samples, activeSample.utcTime)} y1="0" x2={percentForUtc(samples, activeSample.utcTime)} y2="100" className="focus-line" />}
      </svg>
      <div className="terminal-tooltip" aria-live="polite">
        <span>{sampleLabel(activeSample, t)}</span>
        <span>{t("sun")}: {formatAltitude(activeSample?.sun)}</span>
        <span>{t("moon")}: {formatAltitude(activeSample?.moon)}</span>
        <span>{activeRecommendation(activeSample, t)}</span>
      </div>
    </section>
  );
}
