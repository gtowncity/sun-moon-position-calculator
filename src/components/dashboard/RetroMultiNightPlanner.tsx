import type { Translator } from "../../i18n";
import type { DashboardInsight } from "../../app/insights";
import type { NightSummary } from "../../domain/insights/effectiveImagingWindow";
import { formatDuration, formatWindow, nightQualityLabel } from "./utils";

interface RetroMultiNightPlannerProps {
  insight: DashboardInsight;
  onDaySelect: (localDate: string) => void;
  t: Translator;
}

function averageMoonIllumination(summary: NightSummary): number {
  const values = summary.samples
    .map((sample) => sample.moonIlluminationPercent)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function RetroMultiNightPlanner({ insight, onDaySelect, t }: RetroMultiNightPlannerProps) {
  if (insight.multiNightSummaries.length === 0) return null;

  return (
    <section className="planner-panel">
      <div className="terminal-section-title">[{t("multiNightDatabase")}]</div>
      <div className="planner-table" role="table" aria-label={t("multiNightPlanner")}>
        <div role="row" className="planner-row planner-header">
          <span role="columnheader">{t("night")}</span>
          <span role="columnheader">{t("quality")}</span>
          <span role="columnheader">{t("astronomicalShort")}</span>
          <span role="columnheader">{t("moonInterference")}</span>
          <span role="columnheader">{t("bestWindow")}</span>
        </div>
        {insight.multiNightSummaries.map((summary) => (
          <button type="button" role="row" key={summary.nightStartDate} className={`planner-row night-${summary.quality}`} onClick={() => onDaySelect(summary.nightStartDate)}>
            <span role="cell">{summary.nightStartDate.slice(5)} -&gt; {summary.nightEndDate.slice(5)}</span>
            <span role="cell">[{nightQualityLabel(summary.quality, t)}]</span>
            <span role="cell">{formatDuration(summary.astronomicalNightMinutes)}</span>
            <span role="cell">{averageMoonIllumination(summary).toFixed(0)}%</span>
            <span role="cell">{summary.effectiveWindow ? formatWindow(summary.effectiveWindow.startLocal, summary.effectiveWindow.endLocal, t) : t("notInRange")}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
