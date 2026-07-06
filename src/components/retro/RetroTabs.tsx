import { RetroButton } from "./RetroButton";

export interface RetroTabOption<T extends string> {
  value: T;
  label: string;
}

interface RetroTabsProps<T extends string> {
  options: RetroTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

export function RetroTabs<T extends string>({ options, value, onChange, label }: RetroTabsProps<T>) {
  return (
    <div className="retro-tabs" role="tablist" aria-label={label}>
      {options.map((option) => (
        <RetroButton
          key={option.value}
          type="button"
          active={option.value === value}
          role="tab"
          aria-selected={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </RetroButton>
      ))}
    </div>
  );
}
