import type { Language } from "../types";
import de from "./de.json";
import en from "./en.json";

export const translations = { de, en } as const;

export type TranslationKey = keyof typeof en;
export type Translator = (key: TranslationKey) => string;

export function getTranslator(language: Language): Translator {
  return (key) => translations[language][key] ?? key;
}

export function isLanguage(value: string | null): value is Language {
  return value === "de" || value === "en";
}

export function detectBrowserLanguage(value = typeof navigator === "undefined" ? "en" : navigator.language): Language {
  return value.toLowerCase().startsWith("de") ? "de" : "en";
}
