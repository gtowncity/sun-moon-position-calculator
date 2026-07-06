import type { ReactNode } from "react";

interface RetroAccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function RetroAccordion({ title, children, defaultOpen = false }: RetroAccordionProps) {
  return (
    <details className="retro-accordion" open={defaultOpen}>
      <summary>{title}</summary>
      <div>{children}</div>
    </details>
  );
}
