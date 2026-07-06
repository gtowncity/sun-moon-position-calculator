import type { EventResult } from "../types";
import type { Translator } from "../i18n";
import type { DashboardInsight, TimeSample } from "../app/insights";
import type { ImagingMode } from "../domain/insights/effectiveImagingWindow";
import { EffectiveImagingWindowDisplay } from "./dashboard/EffectiveImagingWindowDisplay";
import { MoonInterferenceReport } from "./dashboard/MoonInterferenceReport";
import { OscilloscopeAltitudeChart } from "./dashboard/OscilloscopeAltitudeChart";
import { QualityDiagnostics } from "./dashboard/QualityDiagnostics";
import { RadarSkyCompass } from "./dashboard/RadarSkyCompass";
import { RetroMultiNightPlanner } from "./dashboard/RetroMultiNightPlanner";
import { TerminalHero } from "./dashboard/TerminalHero";
import { TerminalNightTimeline } from "./dashboard/TerminalNightTimeline";
import { TwilightPhaseTable } from "./dashboard/TwilightPhaseTable";
import type { Language } from "../types";

export type RangePreset = "night" | "3d" | "7d" | "14d" | "30d" | "custom";
export type AnalysisMode = "instant" | "night" | "multi" | "custom";

export interface DashboardProps {
  insight: DashboardInsight;
  events: EventResult[];
  focusedSample: TimeSample | null;
  hoveredSample: TimeSample | null;
  rangePreset: RangePreset;
  analysisMode: AnalysisMode;
  imagingMode: ImagingMode;
  language: Language;
  onRangePreset: (preset: RangePreset) => void;
  onFocusUtc: (utcTime: string | null) => void;
  onHoverUtc: (utcTime: string | null) => void;
  onDaySelect: (localDate: string) => void;
  onJumpToTimeline: () => void;
  t: Translator;
}

export { formatDuration } from "./dashboard/utils";

export function AstroDashboard(props: DashboardProps) {
  const { insight, focusedSample, hoveredSample, imagingMode, language, t } = props;

  return (
    <section className="astro-terminal-workbench" aria-label={t("astroDashboard")}>
      <div className="main-analysis">
        <TerminalHero insight={insight} imagingMode={imagingMode} onJumpToTimeline={props.onJumpToTimeline} t={t} />
        <EffectiveImagingWindowDisplay summary={insight.nightSummary} t={t} />
        <TerminalNightTimeline
          insight={insight}
          events={props.events}
          focusedSample={focusedSample}
          onFocusUtc={props.onFocusUtc}
          onHoverUtc={props.onHoverUtc}
          t={t}
        />
        <TwilightPhaseTable summary={insight.nightSummary} t={t} />
      </div>

      <section className="instrument-cluster" aria-label={t("instrumentCluster")}>
        <div className="terminal-section-title">[{t("instrumentCluster")}]</div>
        <div className="instrument-grid">
          <OscilloscopeAltitudeChart
            insight={insight}
            focusedSample={focusedSample}
            hoveredSample={hoveredSample}
            onFocusUtc={props.onFocusUtc}
            onHoverUtc={props.onHoverUtc}
            t={t}
          />
          <RadarSkyCompass focusedSample={focusedSample} language={language} t={t} />
          <MoonInterferenceReport focusedSample={focusedSample} insight={insight} t={t} />
          <QualityDiagnostics insight={insight} t={t} />
        </div>
      </section>

      <RetroMultiNightPlanner insight={insight} onDaySelect={props.onDaySelect} t={t} />
    </section>
  );
}
