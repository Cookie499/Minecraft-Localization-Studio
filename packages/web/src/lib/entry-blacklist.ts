import type { TranslationEntry } from '@mls/core';

const STORAGE_KEY = 'mls.entry-blacklist.v1';

export function normalizeEntryBlacklist(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function loadEntryBlacklist(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    return Array.isArray(parsed)
      ? normalizeEntryBlacklist(parsed.filter((value): value is string => typeof value === 'string'))
      : [];
  } catch {
    return [];
  }
}

export function saveEntryBlacklist(values: string[]): string[] {
  const normalized = normalizeEntryBlacklist(values);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function isEntryBlacklisted(
  entry: TranslationEntry,
  blacklist: readonly string[],
): boolean {
  return blacklist.includes(entry.original);
}
