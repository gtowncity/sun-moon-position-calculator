import type { Translator } from "../../i18n";
import type { NightSummary } from "../../domain/insights/effectiveImagingWindow";
import { formatDuration, formatWindow } from "./utils";

interface EffectiveImagingWindowDisplayProps {
  summary: NightSummary | null;
  t: Translator;
}

export function EffectiveImagingWindowDisplay({ summary, t }: EffectiveImagingWindowDisplayProps) {
  const cards = [
    { label: t("totalNight"), value: formatDuration(summary?.totalNightMinutes ?? 0), note: t("sunBelowHorizon") },
    { label: t("sunBelowMinus12"), value: formatDuration(summary?.nauticalDarkMinutes ?? 0), note: t("nauticalDarkness") },
    { label: t("sunBelowMinus18"), value: formatDuration(summary?.astronomicalNightMinutes ?? 0), note: t("astronomicalNight") },
    { label: t("recommendedEffective"), value: summary?.effectiveWindow ? formatWindow(summary.effectiveWindow.startLocal, summary.effectiveWindow.endLocal, t) : t("notInRange"), note: t("selectedMode") }
  ];

  return (
    <section className="effective-window-display" aria-label={t("effectiveImagingWindow")}>
      {cards.map((card) => (
        <article key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <small>{card.note}</small>
        </article>
      ))}
    </section>
  );
}
