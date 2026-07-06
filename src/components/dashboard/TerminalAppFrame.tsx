import type { ReactNode } from "react";
import type { Language } from "../../types";
import type { Translator } from "../../i18n";
import { CrtScreen } from "../retro/CrtScreen";
import { RetroButton } from "../retro/RetroButton";
import { RetroSelect } from "../retro/RetroSelect";
import { RetroStatusBar } from "../retro/RetroStatusBar";
import { RetroTitleBar } from "../retro/RetroTitleBar";
import { RetroWindow } from "../retro/RetroWindow";

interface TerminalAppFrameProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  crtEnabled: boolean;
  onToggleCrt: () => void;
  statusItems: string[];
  children: ReactNode;
  t: Translator;
}

export function TerminalAppFrame({
  language,
  onLanguageChange,
  crtEnabled,
  onToggleCrt,
  statusItems,
  children,
  t
}: TerminalAppFrameProps) {
  return (
    <CrtScreen enabled={crtEnabled}>
      <main className="app-shell">
        <RetroWindow className="terminal-shell">
          <RetroTitleBar title={t("terminalTitle")}>
            <label className="terminal-language">
              <span>{t("language")}</span>
              <RetroSelect value={language} onChange={(event) => onLanguageChange(event.target.value as Language)}>
                <option value="de">{t("german")}</option>
                <option value="en">{t("english")}</option>
              </RetroSelect>
            </label>
            <RetroButton type="button" active={crtEnabled} onClick={onToggleCrt}>
              {crtEnabled ? t("crtFxOn") : t("crtFxOff")}
            </RetroButton>
          </RetroTitleBar>
          <nav className="terminal-menu" aria-label={t("terminalMenu")}>
            <span>{t("menuFile")}</span>
            <span>{t("menuAnalyze")}</span>
            <span>{t("menuView")}</span>
            <span>{t("menuExport")}</span>
            <span>{t("menuSettings")}</span>
            <span>{t("menuHelp")}</span>
          </nav>
          <RetroStatusBar items={statusItems} />
          {children}
        </RetroWindow>
      </main>
    </CrtScreen>
  );
}
