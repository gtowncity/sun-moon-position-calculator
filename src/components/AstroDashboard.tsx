import { CalendarDays, Compass, Info, Moon, Sparkles, SunMedium, Telescope } from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
import type { EventResult, ResultRow } from "../types";
import type { TranslationKey, Translator } from "../i18n";
import type { DashboardInsight, ObservationQuality, TimeSample } from "../app/insights";
import { eventMatchesSample, nearestSampleByPercent } from "../app/insights";
import type { ImagingMode, NightSummary, SolarDarknessClass } from "../domain/insights/effectiveImagingWindow";
import { classifySolarAltitudeForImaging, imagingModeThreshold } from "../domain/insights/effectiveImagingWindow";
import { calculateMoonInterference } from "../domain/insights/moonInterference";
import { formatEventKind } from "../lib/export/columns";

export type RangePreset = "night" | "3d" | "7d" | "14d" | "30d" | "custom";
export type AnalysisMode = "instant" | "night" | "multi" | "custom";

interface DashboardProps {
  insight: DashboardInsight;
  events: EventResult[];
  focusedSample: TimeSample | null;
  hoveredSample: TimeSample | null;
  rangePreset: RangePreset;
  analysisMode: AnalysisMode;
  imagingMode: ImagingMode;
  onRangePreset: (preset: RangePreset) => void;
  onFocusUtc: (utcTime: string | null) => void;
  onHoverUtc: (utcTime: string | null) => void;
  onDaySelect: (localDate: string) => void;
  onJumpToTimeline: () => void;
  t: Translator;
}

function qualityLabel(quality: ObservationQuality, t: Translator): string {
  const key = `quality_${quality}` as TranslationKey;
  return t(key);
}

function nightQualityLabel(summary: NightSummary | null, t: Translator): string {
  if (!summary) return t("quality_poor");
  return t(`nightQuality_${summary.quality}` as TranslationKey);
}

function scoreClass(score: number): string {
  if (score >= 82) return "score-excellent";
  if (score >= 65) return "score-good";
  if (score >= 42) return "score-mixed";
  return "score-poor";
}

export function formatDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  if (hours <= 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function formatWindow(start: string | null | undefined, end: string | null | undefined, t: Translator): string {
  return start && end ? `${start}-${end}` : t("notInRange");
}

function formatAltitude(row: ResultRow | null | undefined): string {
  if (!row) return "-";
  return `${row.apparentAltitudeDeg.toFixed(1)} deg`;
}

function sampleLabel(sample: TimeSample | null, t: Translator): string {
  if (!sample) return t("noRows");
  return `${sample.localTime.slice(0, 5)} ${sample.localDate}`;
}

function samplesForNight(insight: DashboardInsight): TimeSample[] {
  const summary = insight.nightSummary;
  if (!summary) return insight.samples;
  const allowed = new Set(summary.samples.map((sample) => sample.utcTime));
  return insight.samples.filter((sample) => allowed.has(sample.utcTime));
}

function classForSample(sample: TimeSample): SolarDarknessClass {
  return classifySolarAltitudeForImaging(sample.sun?.geometricAltitudeDeg ?? null).darknessClass;
}

function activeRecommendation(sample: TimeSample | null, t: Translator): string {
  const usefulness = classifySolarAltitudeForImaging(sample?.sun?.geometricAltitudeDeg ?? null).usefulness;
  return t(`imagingUsefulness_${usefulness}` as TranslationKey);
}

export function NightHero({ insight, imagingMode, onJumpToTimeline, t }: Pick<DashboardProps, "insight" | "imagingMode" | "onJumpToTimeline" | "t">) {
  const summary = insight.nightSummary;
  const window = summary?.effectiveWindow;
  const hasWindow = Boolean(window);
  const warning = summary?.warning ? t(`nightWarning_${summary.warning}` as TranslationKey) : t("nightReasonClear");

  return (
    <button type="button" className={`night-hero ${summary ? `night-${summary.quality}` : "night-poor"} ${hasWindow ? "" : "no-window"}`} onClick={onJumpToTimeline}>
      <span className="hero-status-pill">{nightQualityLabel(summary, t)}</span>
      <span className="eyebrow"><Telescope size={18} aria-hidden="true" /> {t("astroNightCalculator")}</span>
      <span className="night-label">{summary ? `${t("nightFrom")}: ${summary.nightLabel}` : t("noRows")}</span>
      <strong>{hasWindow ? formatWindow(window?.startLocal, window?.endLocal, t) : t("noEffectiveWindow")}</strong>
      <span className="hero-subline">
        {hasWindow
          ? `${formatDuration(window?.durationMinutes ?? 0)} ${t("effectiveUsable")} · ${formatDuration(summary?.astronomicalNightMinutes ?? 0)} ${t("realAstronomicalNight")}`
          : warning}
      </span>
      <span className="hero-detail">
        {hasWindow
          ? `${t("imagingMode")}: ${t(`imagingMode_${imagingMode}` as TranslationKey)} (${imagingModeThreshold(imagingMode)} deg)`
          : t("brightTargetsFallback")}
      </span>
    </button>
  );
}

export function RangeSelector({ rangePreset, onRangePreset, t }: Pick<DashboardProps, "rangePreset" | "onRangePreset" | "t">) {
  const options: RangePreset[] = ["night", "3d", "7d", "14d", "30d", "custom"];

  return (
    <section className="range-selector" aria-label={t("rangeExplorer")}>
      {options.map((option) => (
        <button
          type="button"
          key={option}
          className={rangePreset === option ? "is-active" : ""}
          onClick={() => onRangePreset(option)}
        >
          {t(`range_${option}` as TranslationKey)}
        </button>
      ))}
    </section>
  );
}

export function ScoreCard({
  title,
  score,
  detail,
  icon
}: {
  title: string;
  score: number;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <details className={`score-card ${scoreClass(score)}`}>
      <summary>
        <span>{icon}</span>
        <strong>{title}</strong>
        <b>{score}/100</b>
      </summary>
      <p>{detail}</p>
    </details>
  );
}

export function NightSummaryCards({ summary, t }: { summary: NightSummary | null; t: Translator }) {
  const cards = [
    { label: t("totalNight"), value: formatDuration(summary?.totalNightMinutes ?? 0), detail: t("sunBelowHorizon") },
    { label: t("sunBelowMinus12"), value: formatDuration(summary?.nauticalDarkMinutes ?? 0), detail: t("nauticalDarkness") },
    { label: t("sunBelowMinus18"), value: formatDuration(summary?.astronomicalNightMinutes ?? 0), detail: t("astronomicalNight") },
    { label: t("recommendedEffective"), value: formatDuration(summary?.effectiveWindow?.durationMinutes ?? 0), detail: t("selectedMode") }
  ];

  return (
    <section className="night-summary-panel dashboard-panel">
      <div className="panel-heading">
        <h2>{t("nightAnalysis")}</h2>
        <span>{summary?.warning ? t(`nightWarning_${summary.warning}` as TranslationKey) : t("nightReasonClear")}</span>
      </div>
      <div className="milestone-grid">
        <span>{t("sunset")}<b>{summary?.milestones.sunset ?? t("notInRange")}</b></span>
        <span>{t("civilDuskEnd")}<b>{summary?.milestones.civilDuskEnd ?? t("notInRange")}</b></span>
        <span>{t("nauticalDuskEnd")}<b>{summary?.milestones.nauticalDuskEnd ?? t("notInRange")}</b></span>
        <span>{t("astronomicalNightStart")}<b>{summary?.milestones.astronomicalNightStart ?? t("notInRange")}</b></span>
        <span>{t("astronomicalNightEnd")}<b>{summary?.milestones.astronomicalNightEnd ?? t("notInRange")}</b></span>
        <span>{t("nauticalDawnStart")}<b>{summary?.milestones.nauticalDawnStart ?? t("notInRange")}</b></span>
        <span>{t("civilDawnStart")}<b>{summary?.milestones.civilDawnStart ?? t("notInRange")}</b></span>
        <span>{t("sunrise")}<b>{summary?.milestones.sunrise ?? t("notInRange")}</b></span>
      </div>
      <div className="duration-card-grid">
        {cards.map((card) => (
          <article key={card.label} className="duration-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <i>{card.detail}</i>
          </article>
        ))}
      </div>
    </section>
  );
}

export function TwilightPhaseLegend({ t }: { t: Translator }) {
  return (
    <div className="twilight-legend" aria-label={t("twilightLegend")}>
      <span className="civil_twilight">-6 deg {t("civilTwilight")}</span>
      <span className="nautical_twilight">-12 deg {t("nauticalTwilight")}</span>
      <span className="astronomical_night">-18 deg {t("astronomicalNight")}</span>
    </div>
  );
}

export function NightTimeline({ insight, events, focusedSample, onFocusUtc, onHoverUtc, t }: DashboardProps) {
  const samples = samplesForNight(insight);
  const summary = insight.nightSummary;

  return (
    <section className="dashboard-panel timeline-panel night-planner-panel" id="night-timeline">
      <div className="panel-heading large-heading">
        <div>
          <h2>{t("nightTimeline")}</h2>
          <p>{t("timelineExplainer")}</p>
        </div>
        <span>{sampleLabel(focusedSample, t)}</span>
      </div>
      <div className="phase-band" aria-hidden="true">
        {summary?.segments.map((segment) => (
          <span
            key={`${segment.startUtc}-${segment.darknessClass}`}
            className={segment.darknessClass}
            style={{ flexGrow: Math.max(1, segment.durationMinutes) }}
          >
            {segment.darknessClass === "astronomical_night" ? t("astronomicalNight") : ""}
          </span>
        ))}
      </div>
      <div className="timeline-scroll large-timeline" role="list" aria-label={t("nightTimeline")}>
        {samples.map((sample) => {
          const eventHere = events.find((event) => eventMatchesSample(event, sample));
          const darknessClass = classForSample(sample);
          return (
            <button
              type="button"
              role="listitem"
              key={sample.utcTime}
              className={`timeline-sample ${sample.quality} ${darknessClass} ${focusedSample?.utcTime === sample.utcTime ? "is-focused" : ""}`}
              onClick={() => onFocusUtc(sample.utcTime)}
              onMouseEnter={() => onHoverUtc(sample.utcTime)}
              onMouseLeave={() => onHoverUtc(null)}
              title={`${sample.localTime.slice(0, 5)} | ${t("sun")}: ${sample.sun?.geometricAltitudeDeg.toFixed(1) ?? "-"} deg | ${t("moon")}: ${sample.moon?.apparentAltitudeDeg.toFixed(1) ?? "-"} deg | ${activeRecommendation(sample, t)}`}
            >
              <span>{sample.localTime.slice(0, 5)}</span>
              <b>{sample.sun?.geometricAltitudeDeg.toFixed(0) ?? "-"} deg</b>
              {eventHere && <i>{formatEventKind(eventHere.kind, t)}</i>}
            </button>
          );
        })}
      </div>
      <TwilightPhaseLegend t={t} />
    </section>
  );
}

function chartY(altitude: number): number {
  return 100 - ((Math.max(-30, Math.min(60, altitude)) + 30) / 90) * 100;
}

function chartPoints(samples: TimeSample[], body: "sun" | "moon"): string {
  if (samples.length === 0) return "";
  return samples
    .map((sample, index) => {
      const row = sample[body];
      const x = samples.length === 1 ? 0 : (index / (samples.length - 1)) * 100;
      const altitude = row?.apparentAltitudeDeg ?? -30;
      return `${x},${chartY(altitude)}`;
    })
    .join(" ");
}

function percentForUtc(samples: TimeSample[], utcTime: string): number {
  if (samples.length < 2) return 0;
  const first = new Date(samples[0].utcTime).getTime();
  const last = new Date(samples[samples.length - 1].utcTime).getTime();
  const value = new Date(utcTime).getTime();
  return Math.max(0, Math.min(100, ((value - first) / Math.max(1, last - first)) * 100));
}

export function AltitudeChart({ insight, focusedSample, hoveredSample, onFocusUtc, onHoverUtc, t }: DashboardProps) {
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
    <section className="dashboard-panel chart-panel altitude-panel">
      <div className="panel-heading large-heading">
        <div>
          <h2>{t("altitudeChart")}</h2>
          <p>{activeRecommendation(activeSample, t)}</p>
        </div>
        <span>{sampleLabel(activeSample, t)}</span>
      </div>
      <svg className="altitude-chart" viewBox="0 0 100 100" role="img" aria-label={t("altitudeChart")} onPointerMove={handlePointer} onPointerLeave={() => onHoverUtc(null)} onClick={() => activeSample && onFocusUtc(activeSample.utcTime)}>
        {bandStart !== null && bandEnd !== null && <rect x={bandStart} y="0" width={Math.max(0, bandEnd - bandStart)} height="100" className="best-window-band" />}
        {[0, -6, -12, -18].map((threshold) => (
          <g key={threshold}>
            <line x1="0" y1={chartY(threshold)} x2="100" y2={chartY(threshold)} className={threshold === 0 ? "horizon-line" : "twilight-line"} />
            <text x="1" y={Math.max(5, chartY(threshold) - 1)}>{threshold} deg</text>
          </g>
        ))}
        <polyline points={chartPoints(samples, "sun")} className="sun-line" />
        <polyline points={chartPoints(samples, "moon")} className="moon-line" />
        {activeSample && (
          <line
            x1={percentForUtc(samples, activeSample.utcTime)}
            y1="0"
            x2={percentForUtc(samples, activeSample.utcTime)}
            y2="100"
            className="focus-line"
          />
        )}
      </svg>
      <div className="chart-tooltip" aria-live="polite">
        <span>{t("sun")}: {formatAltitude(activeSample?.sun)}</span>
        <span>{t("moon")}: {formatAltitude(activeSample?.moon)}</span>
        <span>UTC: {activeSample?.utcTime ?? "-"}</span>
      </div>
    </section>
  );
}

export function SkyCompass({ focusedSample, t }: Pick<DashboardProps, "focusedSample" | "t">) {
  const bodies: Array<["sun" | "moon", ResultRow | null | undefined]> = [
    ["sun", focusedSample?.sun],
    ["moon", focusedSample?.moon]
  ];

  return (
    <section className="dashboard-panel compass-panel sky-panel">
      <div className="panel-heading">
        <h2>{t("skyCompass")}</h2>
        <span>{sampleLabel(focusedSample, t)}</span>
      </div>
      <div className="compass-face" aria-label={t("skyCompass")}>
        <span className="north">N</span>
        <span className="east">E</span>
        <span className="south">S</span>
        <span className="west">W</span>
        <span className="azimuth-ring" />
        {bodies.map(([body, row]) => {
          const angle = row?.azimuthDeg ?? 0;
          const visible = Boolean(row && row.apparentAltitudeDeg > 0);
          const radius = visible ? 36 : 47;
          const x = 50 + Math.sin((angle * Math.PI) / 180) * radius;
          const y = 50 - Math.cos((angle * Math.PI) / 180) * radius;
          return (
            <span
              key={body}
              className={`compass-dot ${body} ${visible ? "" : "is-below"}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={`${t(body)} ${row?.azimuthDeg.toFixed(1) ?? "-"} deg`}
            >
              {body === "sun" ? <SunMedium size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
              <i>{row ? `${row.apparentAltitudeDeg.toFixed(0)} deg` : "-"}</i>
            </span>
          );
        })}
      </div>
    </section>
  );
}

export function MoonInterferenceCard({ focusedSample, insight, t }: Pick<DashboardProps, "focusedSample" | "insight" | "t">) {
  const moonSummary = calculateMoonInterference(focusedSample?.moon);
  const value = Math.round(focusedSample?.moonInterference ?? insight.moonInterference);
  const illumination = focusedSample?.moon?.illuminationPercent ?? 0;
  const moonAltitude = focusedSample?.moon?.apparentAltitudeDeg ?? null;

  return (
    <section className="dashboard-panel moon-panel">
      <div className="panel-heading">
        <h2>{t("moonInterference")}</h2>
        <span>{t(`moonInterferenceLevel_${moonSummary.level}` as TranslationKey)}</span>
      </div>
      <div className="interference-meter" title={t("moonInterferenceDetail")}>
        <span style={{ width: `${value}%` }} />
      </div>
      <div className="moon-detail-grid">
        <span>{t("moonIllumination")}<b>{illumination.toFixed(0)}%</b></span>
        <span>{t("moonAltitude")}<b>{moonAltitude !== null ? `${moonAltitude.toFixed(1)} deg` : "-"}</b></span>
      </div>
      <p>{t(`moonInterferenceNote_${moonSummary.note}` as TranslationKey)}</p>
    </section>
  );
}

export function EventCards({ events, onFocusUtc, t }: Pick<DashboardProps, "events" | "onFocusUtc" | "t">) {
  const visibleEvents = events.filter((event) => event.status === "found").slice(0, 8);

  return (
    <section className="dashboard-panel event-panel">
      <div className="panel-heading">
        <h2>{t("eventsSection")}</h2>
        <span><CalendarDays size={16} aria-hidden="true" /></span>
      </div>
      <div className="event-grid">
        {visibleEvents.map((event) => (
          <button
            type="button"
            key={`${event.body}-${event.kind}-${event.utcTime}`}
            disabled={!event.utcTime}
            onClick={() => onFocusUtc(event.utcTime)}
            title={event.utcTime ?? t("noEvent")}
          >
            <span>{event.body === "sun" ? <SunMedium size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}</span>
            <strong>{formatEventKind(event.kind, t)}</strong>
            <i>{event.status === "found" ? `${event.localDate} ${event.localTime?.slice(0, 5)}` : t("noEvent")}</i>
          </button>
        ))}
      </div>
    </section>
  );
}

function averageMoonIllumination(summary: NightSummary): number {
  const values = summary.samples
    .map((sample) => sample.moonIlluminationPercent)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function MultiNightPlanner({ insight, onDaySelect, t }: Pick<DashboardProps, "insight" | "onDaySelect" | "t">) {
  return (
    <section className="dashboard-panel heatmap-panel multi-night-panel">
      <div className="panel-heading large-heading">
        <div>
          <h2>{t("multiNightPlanner")}</h2>
          <p>{t("clickDayHint")}</p>
        </div>
        <span><Info size={16} aria-hidden="true" /></span>
      </div>
      <div className="multi-night-grid">
        {insight.multiNightSummaries.map((summary) => (
          <button
            type="button"
            key={summary.nightStartDate}
            className={`night-card night-${summary.quality}`}
            onClick={() => onDaySelect(summary.nightStartDate)}
            title={`${summary.nightLabel}: ${nightQualityLabel(summary, t)}`}
          >
            <strong>{summary.nightStartDate.slice(5)} {"->"} {summary.nightEndDate.slice(5)}</strong>
            <span>{nightQualityLabel(summary, t)}</span>
            <b>{formatDuration(summary.astronomicalNightMinutes)} {t("astronomicalShort")}</b>
            <i>{t("bestWindow")}: {summary.effectiveWindow ? formatWindow(summary.effectiveWindow.startLocal, summary.effectiveWindow.endLocal, t) : t("notInRange")}</i>
            <em>{t("moonIllumination")}: {averageMoonIllumination(summary).toFixed(0)}%</em>
            <small className="mini-timeline">
              {summary.segments.map((segment) => <span key={`${segment.startUtc}-${segment.darknessClass}`} className={segment.darknessClass} style={{ flexGrow: Math.max(1, segment.durationMinutes) }} />)}
            </small>
          </button>
        ))}
      </div>
    </section>
  );
}

export function AstroDashboard(props: DashboardProps) {
  const { insight, focusedSample, imagingMode, t } = props;

  return (
    <section className="dashboard-grid astro-workbench" aria-label={t("astroDashboard")}>
      <div className="dashboard-hero">
        <NightHero insight={insight} imagingMode={imagingMode} onJumpToTimeline={props.onJumpToTimeline} t={t} />
        <RangeSelector rangePreset={props.rangePreset} onRangePreset={props.onRangePreset} t={t} />
      </div>

      <NightSummaryCards summary={insight.nightSummary} t={t} />

      <NightTimeline {...props} />
      <AltitudeChart {...props} />
      <SkyCompass focusedSample={focusedSample} t={t} />
      <MoonInterferenceCard focusedSample={focusedSample} insight={insight} t={t} />
      <EventCards events={props.events} onFocusUtc={props.onFocusUtc} t={t} />
      <MultiNightPlanner insight={insight} onDaySelect={props.onDaySelect} t={t} />
      <section className="dashboard-panel compass-note">
        <Compass size={22} aria-hidden="true" />
        <p>{t("compassNote")}</p>
      </section>
      <div className="score-row secondary-scores">
        <ScoreCard title={t("darknessScore")} score={insight.darknessScore} detail={t("darknessScoreDetail")} icon={<Sparkles size={18} aria-hidden="true" />} />
        <ScoreCard title={t("moonInterference")} score={100 - insight.moonInterference} detail={t("moonScoreDetail")} icon={<Moon size={18} aria-hidden="true" />} />
        <ScoreCard title={t("usableWindow")} score={insight.usabilityScore} detail={t("usableWindowDetail")} icon={<Telescope size={18} aria-hidden="true" />} />
      </div>
    </section>
  );
}
