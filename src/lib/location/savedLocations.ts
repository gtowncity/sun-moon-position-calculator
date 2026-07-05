import type { LocationSource, SavedLocation } from "../../types";

const storageKey = "sunMoonSavedLocations";

export interface SavedLocationInput {
  name: string;
  latitude: number;
  longitude: number;
  elevationMeters: number;
  timeZone: string;
  source: LocationSource;
}

function safeParse(value: string | null): SavedLocation[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as SavedLocation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadSavedLocations(storage: Storage = localStorage): SavedLocation[] {
  return safeParse(storage.getItem(storageKey));
}

export function saveLocations(locations: SavedLocation[], storage: Storage = localStorage): void {
  storage.setItem(storageKey, JSON.stringify(locations));
}

export function upsertSavedLocation(
  input: SavedLocationInput,
  storage: Storage = localStorage,
  id: string = crypto.randomUUID()
): SavedLocation[] {
  const locations = loadSavedLocations(storage);
  const existingIndex = locations.findIndex((location) => location.name.trim().toLowerCase() === input.name.trim().toLowerCase());
  const saved: SavedLocation = {
    id: existingIndex >= 0 ? locations[existingIndex].id : id,
    name: input.name.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    elevationMeters: input.elevationMeters,
    timeZone: input.timeZone,
    source: input.source,
    lastUsedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    locations[existingIndex] = saved;
  } else {
    locations.push(saved);
  }

  saveLocations(locations, storage);
  return locations;
}

export function markSavedLocationUsed(
  id: string,
  storage: Storage = localStorage,
  now = new Date().toISOString()
): SavedLocation[] {
  const locations = loadSavedLocations(storage).map((location) =>
    location.id === id ? { ...location, lastUsedAt: now } : location
  );
  saveLocations(locations, storage);
  return locations;
}

export function deleteSavedLocation(id: string, storage: Storage = localStorage): SavedLocation[] {
  const locations = loadSavedLocations(storage).filter((location) => location.id !== id);
  saveLocations(locations, storage);
  return locations;
}
