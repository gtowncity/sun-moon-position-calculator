import { defaultDsoSetupProfile, fallbackDsoSetupProfile, qualityProfiles } from "../catalog/objectProfiles";
import type { DsoPlannerSettings, DsoSetupProfile, QualityProfileId } from "../types";

const setupProfilesKey = "solar-lunar-position-tool.dso.setupProfiles";
const lastSettingsKey = "solar-lunar-position-tool.dso.lastSettings";
const favoriteObjectsKey = "solar-lunar-position-tool.dso.favoriteObjects";
const qualityProfileKey = "solar-lunar-position-tool.dso.qualityProfile";

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function loadDsoSetupProfiles(): DsoSetupProfile[] {
  if (typeof localStorage === "undefined") return [defaultDsoSetupProfile, fallbackDsoSetupProfile];
  const stored = safeParse<DsoSetupProfile[]>(localStorage.getItem(setupProfilesKey), []);
  const withDefaults = [defaultDsoSetupProfile, fallbackDsoSetupProfile, ...stored];
  return withDefaults.filter((profile, index, profiles) => profiles.findIndex((entry) => entry.id === profile.id) === index);
}

export function saveDsoSetupProfiles(profiles: DsoSetupProfile[]): void {
  if (typeof localStorage === "undefined") return;
  const customProfiles = profiles.filter((profile) => profile.id !== defaultDsoSetupProfile.id && profile.id !== fallbackDsoSetupProfile.id);
  localStorage.setItem(setupProfilesKey, JSON.stringify(customProfiles));
}

export function loadLastDsoSettings(): Partial<DsoPlannerSettings> | null {
  if (typeof localStorage === "undefined") return null;
  return safeParse<Partial<DsoPlannerSettings> | null>(localStorage.getItem(lastSettingsKey), null);
}

export function saveLastDsoSettings(settings: DsoPlannerSettings): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(lastSettingsKey, JSON.stringify(settings));
  localStorage.setItem(qualityProfileKey, settings.qualityProfile.id);
}

export function loadFavoriteMessierObjects(): string[] {
  if (typeof localStorage === "undefined") return [];
  return safeParse<string[]>(localStorage.getItem(favoriteObjectsKey), []);
}

export function saveFavoriteMessierObjects(ids: string[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(favoriteObjectsKey, JSON.stringify([...new Set(ids)]));
}

export function loadLastQualityProfileId(): QualityProfileId {
  if (typeof localStorage === "undefined") return "normal";
  const value = localStorage.getItem(qualityProfileKey);
  return qualityProfiles.some((profile) => profile.id === value) ? value as QualityProfileId : "normal";
}
