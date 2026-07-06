import type { Translator, TranslationKey } from "../../i18n";
import type { DashboardInsight, TimeSample } from "../../app/insights";
import type { ImagingMode } from "../../domain/insights/effectiveImagingWindow";
import type { TargetBody } from "../../types";
import { formatDuration, formatWindow, nightQualityToken } from "./utils";
import type { AnalysisMode } from "../AstroDashboard";

interface TerminalHeroProps {
  insight: DashboardInsight;
  focusedSample: TimeSample | null;
  analysisMode: AnalysisMode;
  targetBody: TargetBody;
  imagingMode: ImagingMode;
  onJumpToTimeline: () => void;
  t: Translator;
}

function positionSummary(sample: TimeSample | null, body: "sun" | "moon", t: Translator): string {
  const row = sample?.[body];
  if (!row) return t("notInRange");
  return `${t("columnAzimuthDeg")}: ${row.azimuthDeg.toFixed(3)} | ${t("columnApparentAltitudeDeg")}: ${row.apparentAltitudeDeg.toFixed(3)}`;
}

export function TerminalHero({ insight, focusedSample, analysisMode, targetBody, imagingMode, onJumpToTimeline, t }: TerminalHeroProps) {
  const summary = insight.nightSummary;
  const window = summary?.effectiveWindow;
  const status = summary?.warning ? t(`nightWarning_${summary.warning}` as TranslationKey) : `[${nightQualityToken(summary?.quality)}]`;

  if (analysisMode === "instant") {
    return (
      <section className="terminal-hero night-usable" aria-label={t("terminalHero")}>
        <div className="terminal-hero-header">
          <span>{t("instantResult")}</span>
        </div>
        <div className="terminal-hero-grid">
          <div>
            <p className="terminal-label">{t("localTime")}</p>
            <h1>{focusedSample ? `${focusedSample.localDate} ${focusedSample.localTime.slice(0, 5)}` : t("noRows")}</h1>
            <p className="terminal-label">UTC: {focusedSample?.utcTime ?? "-"}</p>
          </div>
          <div className="terminal-window-readout">
            <p>{t("bodySection")}: {targetBody === "both" ? t("both") : t(targetBody)}</p>
            <strong>{t("instantContext")}</strong>
          </div>
        </div>
        <div className="terminal-hero-metrics">
          <span>{t("currentSunPosition")}<b>{positionSummary(focusedSample, "sun", t)}</b></span>
          <span>{t("currentMoonPosition")}<b>{positionSummary(focusedSample, "moon", t)}</b></span>
          <span>{t("status")}<b>{focusedSample ? t("eventFound") : t("eventNotFound")}</b></span>
        </div>
      </section>
    );
  }

  return (
    <section className={`terminal-hero night-${summary?.quality ?? "poor"}`} aria-label={t("terminalHero")}>
      <div className="terminal-hero-header">
        <span>{t("astroNightAnalysis")}</span>
        <button type="button" onClick={onJumpToTimeline}>{t("jumpToTimeline")}</button>
      </div>
      <div className="terminal-hero-grid">
        <div>
          <p className="terminal-label">{t("nightFrom")}</p>
          <h1>{summary?.nightLabel ?? t("noRows")}</h1>
          <p className="terminal-label">{t("imagingMode")}: {t(`imagingMode_${imagingMode}` as TranslationKey)}</p>
          {targetBody === "moon" && <p className="terminal-label">{t("moonOnlyInternalSunNote")}</p>}
        </div>
        <div className="terminal-window-readout">
          <p>{t("effectiveImagingWindow")}</p>
          <strong>{window ? formatWindow(window.startLocal, window.endLocal, t) : t("noEffectiveWindow")}</strong>
        </div>
      </div>
      <div className="terminal-hero-metrics">
        <span>{t("effectiveUsable")}<b>{formatDuration(window?.durationMinutes ?? 0)}</b></span>
        <span>{t("realAstronomicalNight")}<b>{formatDuration(summary?.astronomicalNightMinutes ?? 0)}</b></span>
        <span>{t("status")}<b>{status}</b></span>
      </div>
      {!window && (
        <p className="terminal-warning">
          {summary?.warning === "no_astronomical_night" ? t("noTrueAstronomicalNightDetail") : t("brightTargetsFallback")}
        </p>
      )}
    </section>
  );
}
