import type { ReactNode } from "react";

interface CrtScreenProps {
  enabled: boolean;
  children: ReactNode;
}

export function CrtScreen({ enabled, children }: CrtScreenProps) {
  return <div className={`crt-screen ${enabled ? "crt-fx-on" : "crt-fx-off"}`}>{children}</div>;
}
