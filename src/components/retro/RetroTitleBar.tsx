import type { ReactNode } from "react";

interface RetroTitleBarProps {
  title: string;
  children?: ReactNode;
}

export function RetroTitleBar({ title, children }: RetroTitleBarProps) {
  return (
    <header className="retro-titlebar">
      <strong>{title}</strong>
      {children && <div className="retro-titlebar-actions">{children}</div>}
    </header>
  );
}
