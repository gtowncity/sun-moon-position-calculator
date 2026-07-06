import type { ReactNode } from "react";

interface RetroWindowProps {
  children: ReactNode;
  className?: string;
}

export function RetroWindow({ children, className = "" }: RetroWindowProps) {
  return <section className={`retro-window ${className}`.trim()}>{children}</section>;
}
