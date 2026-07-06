import type { SelectHTMLAttributes } from "react";

export function RetroSelect({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`retro-select ${className}`.trim()} {...props}>
      {children}
    </select>
  );
}
