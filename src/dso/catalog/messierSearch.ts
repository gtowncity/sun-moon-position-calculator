import type { DeepSkyObject } from "../types";
import { messierCatalog } from "./messierCatalog";
import { objectTypeLabel } from "./objectProfiles";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function searchableTerms(object: DeepSkyObject): string[] {
  return [
    object.id,
    String(object.messierNumber),
    object.primaryName,
    object.germanName ?? "",
    object.constellation,
    object.objectType,
    objectTypeLabel(object.objectType),
    ...object.aliases,
    ...(object.notes ?? []),
    ...object.planningProfile.notes
  ].filter(Boolean);
}

function scoreObject(object: DeepSkyObject, normalizedQuery: string): number {
  const terms = searchableTerms(object).map(normalize);
  if (terms.some((term) => term === normalizedQuery)) return 100;
  if (terms.some((term) => term.startsWith(normalizedQuery))) return 80;
  if (terms.some((term) => term.includes(normalizedQuery))) return 60;
  return 0;
}

export function searchMessierObjects(query: string, limit = 24): DeepSkyObject[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return messierCatalog.slice(0, limit);

  const numeric = normalizedQuery.match(/^(?:m )?(\d{1,3})$/);
  const exactNumber = numeric ? Number(numeric[1]) : null;

  return messierCatalog
    .map((object) => ({
      object,
      score: exactNumber === object.messierNumber ? 120 : scoreObject(object, normalizedQuery)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.object.messierNumber - b.object.messierNumber)
    .slice(0, limit)
    .map((entry) => entry.object);
}
