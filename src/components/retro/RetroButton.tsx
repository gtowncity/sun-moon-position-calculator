import type { ButtonHTMLAttributes, ReactNode } from "react";

interface RetroButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: "default" | "primary" | "danger";
  children: ReactNode;
}

export function RetroButton({ active = false, variant = "default", className = "", children, ...props }: RetroButtonProps) {
  return (
    <button className={`retro-button retro-button-${variant} ${active ? "is-active" : ""} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
