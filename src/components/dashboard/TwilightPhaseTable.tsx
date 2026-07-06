import type { Translator } from "../../i18n";
import type { NightSummary } from "../../domain/insights/effectiveImagingWindow";

interface TwilightPhaseTableProps {
  summary: NightSummary | null;
  t: Translator;
}

export function TwilightPhaseTable({ summary, t }: TwilightPhaseTableProps) {
  const milestones = summary?.milestones;
  const rows = [
    [milestones?.sunset, t("sunset"), "0 deg"],
    [milestones?.civilDuskEnd, t("civilDuskEnd"), "-6 deg"],
    [milestones?.nauticalDuskEnd, t("nauticalDuskEnd"), "-12 deg"],
    [milestones?.astronomicalNightStart, t("astronomicalNightStart"), "-18 deg"],
    [milestones?.astronomicalNightEnd, t("astronomicalNightEnd"), "-18 deg"],
    [milestones?.nauticalDawnStart, t("nauticalDawnStart"), "-12 deg"],
    [milestones?.civilDawnStart, t("civilDawnStart"), "-6 deg"],
    [milestones?.sunrise, t("sunrise"), "0 deg"]
  ];

  return (
    <section className="twilight-table-panel">
      <div className="terminal-section-title">[{t("twilightPhases")}]</div>
      <div className="twilight-table" role="table" aria-label={t("twilightPhases")}>
        {rows.map(([time, label, threshold]) => (
          <div role="row" key={`${label}-${threshold}`}>
            <span role="cell">{time ?? "--:--"}</span>
            <strong role="cell">{label}</strong>
            <em role="cell">{threshold}</em>
          </div>
        ))}
      </div>
    </section>
  );
}
