import type { Translator } from "../../i18n";
import { RetroButton } from "../retro/RetroButton";

interface ExportPanelProps {
  hasRows: boolean;
  onXlsx: () => void;
  onTxt: () => void;
  onMarkdown: () => void;
  t: Translator;
}

export function ExportPanel({ hasRows, onXlsx, onTxt, onMarkdown, t }: ExportPanelProps) {
  return (
    <div className="export-panel" aria-label={t("exportSection")}>
      <span>[{t("exportResultData")}]</span>
      <RetroButton type="button" disabled={!hasRows} onClick={onXlsx}>{t("exportXlsx")}</RetroButton>
      <RetroButton type="button" disabled={!hasRows} onClick={onTxt}>{t("exportTxt")}</RetroButton>
      <RetroButton type="button" disabled={!hasRows} onClick={onMarkdown}>{t("exportMarkdown")}</RetroButton>
    </div>
  );
}
