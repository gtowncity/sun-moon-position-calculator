export function formatMinutesCompact(minutes: number): string {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours <= 0) return `${mins}min`;
  return `${hours}h ${String(mins).padStart(2, "0")}min`;
}

export function formatNumber(value: number, digits = 1): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "";
}

export function joinReasons(values: string[]): string {
  return values.filter(Boolean).join("; ");
}
