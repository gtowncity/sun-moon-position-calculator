import type { TranslationKey, Translator } from "../../i18n";
import type { DashboardInsight, TimeSample } from "../../app/insights";
import { calculateMoonInterference } from "../../domain/insights/moonInterference";

interface MoonInterferenceReportProps {
  focusedSample: TimeSample | null;
  insight: DashboardInsight;
  t: Translator;
}

export function MoonInterferenceReport({ focusedSample, insight, t }: MoonInterferenceReportProps) {
  const moonSummary = calculateMoonInterference(focusedSample?.moon);
  const value = Math.round(focusedSample?.moonInterference ?? insight.moonInterference);
  const illumination = focusedSample?.moon?.illuminationPercent ?? 0;
  const moonAltitude = focusedSample?.moon?.apparentAltitudeDeg ?? null;

  return (
    <section className="instrument-panel moon-report">
      <div className="terminal-section-title">[{t("moonInterferenceReport")}]</div>
      <dl className="terminal-report">
        <dt>{t("moonIllumination")}</dt><dd>{illumination.toFixed(0)}%</dd>
        <dt>{t("moonAltitude")}</dt><dd>{moonAltitude !== null ? `${moonAltitude.toFixed(1)} deg` : "-"}</dd>
        <dt>{t("status")}</dt><dd>{moonSummary.level === "none" ? t("belowHorizon") : t(`moonInterferenceLevel_${moonSummary.level}` as TranslationKey)}</dd>
        <dt>{t("impact")}</dt><dd>{value}/100</dd>
        <dt>{t("targetAngle")}</dt><dd>{t("notCalculated")}</dd>
        <dt>{t("note")}</dt><dd>{t(`moonInterferenceNote_${moonSummary.note}` as TranslationKey)}</dd>
      </dl>
    </section>
  );
}
