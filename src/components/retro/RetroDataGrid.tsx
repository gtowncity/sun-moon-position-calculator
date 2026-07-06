import type { ReactNode } from "react";

interface RetroDataGridProps {
  children: ReactNode;
  className?: string;
}

export function RetroDataGrid({ children, className = "" }: RetroDataGridProps) {
  return <div className={`retro-data-grid ${className}`.trim()}>{children}</div>;
}
