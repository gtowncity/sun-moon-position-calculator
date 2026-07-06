import type { TranslationKey, Translator } from "../../i18n";
import type { DashboardInsight } from "../../app/insights";
import { calculateQualityDiagnostics } from "../../domain/insights/qualityDiagnostics";

interface QualityDiagnosticsProps {
  insight: DashboardInsight;
  t: Translator;
}

export function QualityDiagnostics({ insight, t }: QualityDiagnosticsProps) {
  const diagnostics = calculateQualityDiagnostics(insight);

  return (
    <section className="instrument-panel quality-panel">
      <div className="terminal-section-title">[{t("qualityDiagnostics")}]</div>
      <div className="quality-list">
        {diagnostics.map((item) => (
          <div key={item.key} className={`quality-row quality-${item.status}`}>
            <span>{t(`qualityDiagnostic_${item.key}` as TranslationKey)}</span>
            <b aria-label={`${item.score.toFixed(0)} / 100`}>
              <i style={{ width: `${Math.max(4, item.score)}%` }} />
            </b>
            <em>{item.valueLabel}</em>
          </div>
        ))}
      </div>
    </section>
  );
}
