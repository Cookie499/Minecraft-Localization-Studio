import {
  DEFAULT_NBT_SCAN_OPTIONS,
  type NbtScanOptions,
} from '@mls/core';

const STORAGE_KEY = 'mls.nbt-scan-settings.v1';

export function normalizeNbtBlacklist(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function normalizeNbtScanOptions(options: NbtScanOptions): NbtScanOptions {
  return {
    stringFieldBlacklist: normalizeNbtBlacklist(options.stringFieldBlacklist),
    containerFieldBlacklist: normalizeNbtBlacklist(options.containerFieldBlacklist),
  };
}

export function loadNbtScanOptions(): NbtScanOptions {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return normalizeNbtScanOptions(DEFAULT_NBT_SCAN_OPTIONS);
    const parsed = JSON.parse(stored) as Partial<NbtScanOptions>;
    if (
      !Array.isArray(parsed.stringFieldBlacklist) ||
      !Array.isArray(parsed.containerFieldBlacklist)
    ) {
      return normalizeNbtScanOptions(DEFAULT_NBT_SCAN_OPTIONS);
    }
    return normalizeNbtScanOptions({
      stringFieldBlacklist: parsed.stringFieldBlacklist.filter(
        (value): value is string => typeof value === 'string',
      ),
      containerFieldBlacklist: parsed.containerFieldBlacklist.filter(
        (value): value is string => typeof value === 'string',
      ),
    });
  } catch {
    return normalizeNbtScanOptions(DEFAULT_NBT_SCAN_OPTIONS);
  }
}

export function saveNbtScanOptions(options: NbtScanOptions): NbtScanOptions {
  const normalized = normalizeNbtScanOptions(options);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
