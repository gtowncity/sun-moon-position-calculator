import type { ReactNode } from "react";

interface RetroFieldsetProps {
  legend: string;
  children: ReactNode;
  className?: string;
}

export function RetroFieldset({ legend, children, className = "" }: RetroFieldsetProps) {
  return (
    <fieldset className={`retro-fieldset ${className}`.trim()}>
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}
