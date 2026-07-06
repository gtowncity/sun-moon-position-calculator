import type { Translator, TranslationKey } from "../../i18n";
import type { DashboardInsight } from "../../app/insights";
import type { ImagingMode } from "../../domain/insights/effectiveImagingWindow";
import { formatDuration, formatWindow, nightQualityToken } from "./utils";

interface TerminalHeroProps {
  insight: DashboardInsight;
  imagingMode: ImagingMode;
  onJumpToTimeline: () => void;
  t: Translator;
}

export function TerminalHero({ insight, imagingMode, onJumpToTimeline, t }: TerminalHeroProps) {
  const summary = insight.nightSummary;
  const window = summary?.effectiveWindow;
  const status = summary?.warning ? t(`nightWarning_${summary.warning}` as TranslationKey) : `[${nightQualityToken(summary?.quality)}]`;

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
