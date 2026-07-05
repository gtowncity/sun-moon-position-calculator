export function parseDecimalNumber(value: string, options: { required: boolean }): number | null {
  const trimmed = value.trim();

  if (trimmed === "") {
    return options.required ? null : 0;
  }

  const commaCount = (trimmed.match(/,/g) ?? []).length;
  const dotCount = (trimmed.match(/\./g) ?? []).length;

  if (commaCount > 1 || dotCount > 1 || (commaCount === 1 && dotCount === 1)) {
    return null;
  }

  const normalized = trimmed.replace(",", ".");

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

