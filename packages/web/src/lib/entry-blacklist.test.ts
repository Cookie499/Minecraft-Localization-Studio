import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TranslationEntry } from '@mls/core';
import {
  isEntryBlacklisted,
  loadEntryBlacklist,
  normalizeEntryBlacklist,
  saveEntryBlacklist,
} from './entry-blacklist';

const entry = {
  original: 'Technical entry',
} as TranslationEntry;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('entry blacklist', () => {
  it('removes blank and duplicate values', () => {
    expect(normalizeEntryBlacklist([' Technical entry ', '', 'Technical entry']))
      .toEqual(['Technical entry']);
  });

  it('uses case-sensitive exact source matching', () => {
    expect(isEntryBlacklisted(entry, ['Technical entry'])).toBe(true);
    expect(isEntryBlacklisted(entry, ['technical entry'])).toBe(false);
    expect(isEntryBlacklisted(entry, ['Technical'])).toBe(false);
  });

  it('persists normalized values in local storage', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });

    expect(saveEntryBlacklist([' Hidden ', 'Hidden'])).toEqual(['Hidden']);
    expect(loadEntryBlacklist()).toEqual(['Hidden']);
  });
});
