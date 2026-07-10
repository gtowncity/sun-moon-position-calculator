export interface StoredDsoLocationProfile {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  elevationMeters: number;
  timeZone: string;
  bortle?: number;
  sqm?: number;
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

const storageKey = "solar-lunar-dso-location-profiles";

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function parseProfiles(raw: string | null): StoredDsoLocationProfile[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredLocationProfile);
  } catch {
    return [];
  }
}

function isStoredLocationProfile(value: unknown): value is StoredDsoLocationProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<StoredDsoLocationProfile>;
  return typeof profile.id === "string" &&
    typeof profile.name === "string" &&
    typeof profile.latitude === "number" &&
    typeof profile.longitude === "number" &&
    typeof profile.elevationMeters === "number" &&
    typeof profile.timeZone === "string" &&
    typeof profile.createdAt === "string" &&
    typeof profile.updatedAt === "string" &&
    typeof profile.isDefault === "boolean";
}

function writeProfiles(profiles: StoredDsoLocationProfile[]): void {
  const storage = safeStorage();
  if (!storage) return;
  storage.setItem(storageKey, JSON.stringify(profiles));
}

export function loadDsoLocationProfiles(): StoredDsoLocationProfile[] {
  return parseProfiles(safeStorage()?.getItem(storageKey) ?? null);
}

export function loadDefaultDsoLocationProfile(): StoredDsoLocationProfile | null {
  return loadDsoLocationProfiles().find((profile) => profile.isDefault) ?? null;
}

export function saveDsoLocationProfile(
  profile: Omit<StoredDsoLocationProfile, "id" | "createdAt" | "updatedAt"> & { id?: string }
): StoredDsoLocationProfile {
  const profiles = loadDsoLocationProfiles();
  const now = new Date().toISOString();
  const existing = profile.id ? profiles.find((entry) => entry.id === profile.id) : undefined;
  const next: StoredDsoLocationProfile = {
    ...profile,
    id: profile.id || `dso-location-${Date.now()}`,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  const normalized = next.isDefault
    ? profiles.map((entry) => ({ ...entry, isDefault: false }))
    : profiles;
  const index = normalized.findIndex((entry) => entry.id === next.id);
  const saved = index >= 0
    ? [...normalized.slice(0, index), next, ...normalized.slice(index + 1)]
    : [...normalized, next];
  writeProfiles(saved);
  return next;
}

export function setDefaultDsoLocationProfile(id: string): void {
  writeProfiles(loadDsoLocationProfiles().map((profile) => ({ ...profile, isDefault: profile.id === id })));
}

export function deleteDsoLocationProfile(id: string): void {
  writeProfiles(loadDsoLocationProfiles().filter((profile) => profile.id !== id));
}
