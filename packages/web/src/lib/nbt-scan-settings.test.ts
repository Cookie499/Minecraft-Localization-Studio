import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadNbtScanOptions,
  normalizeNbtScanOptions,
  saveNbtScanOptions,
} from './nbt-scan-settings';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('NBT scan settings', () => {
  it('normalizes both blacklists', () => {
    expect(normalizeNbtScanOptions({
      stringFieldBlacklist: [' Name ', '', 'Name'],
      containerFieldBlacklist: ['Data', ' Data '],
    })).toEqual({
      stringFieldBlacklist: ['Name'],
      containerFieldBlacklist: ['Data'],
    });
  });

  it('persists scan settings', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });

    saveNbtScanOptions({
      stringFieldBlacklist: ['Name'],
      containerFieldBlacklist: ['Data'],
    });
    expect(loadNbtScanOptions()).toEqual({
      stringFieldBlacklist: ['Name'],
      containerFieldBlacklist: ['Data'],
    });
  });
});
