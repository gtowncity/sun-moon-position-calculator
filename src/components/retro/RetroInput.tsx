import type { InputHTMLAttributes } from "react";

export function RetroInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`retro-input ${className}`.trim()} {...props} />;
}
