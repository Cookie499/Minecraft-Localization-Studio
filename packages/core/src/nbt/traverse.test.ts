import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NBT_SCAN_OPTIONS,
  extractFromNbtTree,
  type NbtScanOptions,
} from './traverse.js';
import type { TranslationEntry } from '../types/translation-entry.js';

function extract(node: unknown): TranslationEntry[] {
  const entries: TranslationEntry[] = [];
  extractFromNbtTree(node, '', 'region/r.0.0.mca', 'project', 'mca', entries);
  return entries;
}

function extractWithOptions(node: unknown, options: NbtScanOptions): TranslationEntry[] {
  const entries: TranslationEntry[] = [];
  extractFromNbtTree(
    node,
    '',
    'region/r.0.0.mca',
    'project',
    'mca',
    entries,
    '',
    options,
  );
  return entries;
}

describe('extractFromNbtTree', () => {
  it('ignores blacklisted string fields and technical containers', () => {
    const entries = extract({
      type: 'compound',
      value: {
        id: { type: 'string', value: 'minecraft:stone' },
        Name: { type: 'string', value: 'minecraft:oak_planks' },
        Status: { type: 'string', value: 'full' },
        Properties: {
          type: 'compound',
          value: {
            facing: { type: 'string', value: 'north' },
          },
        },
      },
    });

    expect(entries).toEqual([]);
  });

  it('extracts non-blacklisted fields by default', () => {
    const entries = extract({
      type: 'compound',
      value: {
        CustomName: { type: 'string', value: '{"text":"Named chest"}' },
        DisplayText: { type: 'string', value: '{"text":"Display text"}' },
        'minecraft:custom_name': { type: 'string', value: '"Modern name"' },
        mod_description: { type: 'string', value: 'Unknown mod text' },
      },
    });

    expect(entries.map((entry) => entry.original)).toEqual([
      '{"text":"Named chest"}',
      '{"text":"Display text"}',
      '"Modern name"',
      'Unknown mod text',
    ]);
    expect(entries.map((entry) => entry.sourcePath)).toEqual([
      'CustomName',
      'DisplayText',
      'minecraft:custom_name',
      'mod_description',
    ]);
  });

  it('uses configurable string and container blacklists', () => {
    const node = {
      type: 'compound',
      value: {
        Name: { type: 'string', value: 'Allowed name' },
        Description: { type: 'string', value: 'Blocked description' },
        CustomData: {
          type: 'compound',
          value: {
            Label: { type: 'string', value: 'Blocked child' },
          },
        },
      },
    };
    const options: NbtScanOptions = {
      stringFieldBlacklist: DEFAULT_NBT_SCAN_OPTIONS.stringFieldBlacklist.filter(
        (field) => field !== 'Name',
      ).concat('Description'),
      containerFieldBlacklist: [
        ...DEFAULT_NBT_SCAN_OPTIONS.containerFieldBlacklist,
        'CustomData',
      ],
    };

    expect(extractWithOptions(node, options).map((entry) => entry.original))
      .toEqual(['Allowed name']);
  });

  it('extracts lore and book page lists', () => {
    const entries = extract({
      type: 'compound',
      value: {
        Lore: {
          type: 'list',
          value: ['{"text":"Lore line"}', '{"text":"Second line"}'],
        },
        pages: {
          type: 'list',
          value: ['{"text":"Book page"}'],
        },
      },
    });

    expect(entries.map((entry) => entry.original)).toEqual([
      '{"text":"Lore line"}',
      '{"text":"Second line"}',
      '{"text":"Book page"}',
    ]);
  });

  it('keeps a complete JSON text component in one entry', () => {
    const entries = extract({
      type: 'compound',
      value: {
        CustomName: {
          type: 'string',
          value: '{"text":"Root","extra":[{"text":" Extra"}]}',
        },
      },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.original).toBe('{"text":"Root","extra":[{"text":" Extra"}]}');
    expect(entries[0]?.sourcePath).toBe('CustomName');
    expect(entries[0]?.tags).toContain('whole-json');
  });

  it('ignores JSON-encoded empty strings', () => {
    const entries = extract({
      type: 'compound',
      value: {
        CustomName: { type: 'string', value: '""' },
        title: { type: 'string', value: '   ' },
      },
    });

    expect(entries).toEqual([]);
  });

  it('ignores plain slash commands but keeps commands containing quoted text', () => {
    const entries = extract({
      type: 'compound',
      value: {
        PlainCommand: { type: 'string', value: '/tp @s 0 64 0' },
        TextCommand: { type: 'string', value: '/say "Translate me"' },
        SingleQuotedCommand: { type: 'string', value: "/data modify storage demo text set value 'Translate me too'" },
      },
    });

    expect(entries.map((entry) => entry.original)).toEqual([
      '/say "Translate me"',
      "/data modify storage demo text set value 'Translate me too'",
    ]);
  });
});
