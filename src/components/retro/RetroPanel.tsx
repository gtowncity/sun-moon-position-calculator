import type { ReactNode } from "react";

interface RetroPanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function RetroPanel({ title, children, className = "", id }: RetroPanelProps) {
  return (
    <section id={id} className={`retro-panel ${className}`.trim()}>
      {title && <div className="retro-panel-title">{title}</div>}
      <div className="retro-panel-body">{children}</div>
    </section>
  );
}
