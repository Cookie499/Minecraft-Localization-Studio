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
      'Modern name',
      'Unknown mod text',
    ]);
    expect(entries.map((entry) => entry.sourcePath)).toEqual([
      'CustomName',
      'DisplayText',
      'minecraft:custom_name',
      'mod_description',
    ]);
    expect(entries[2]?.tags).toContain('json-string');
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

  it('combines plain sign message lists into one JSON array entry', () => {
    const entries = extract({
      type: 'compound',
      value: {
        front_text: {
          type: 'compound',
          value: {
            messages: {
              type: 'list',
              value: ['"First line"', '""', '"Third line"', '""'],
            },
          },
        },
      },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.original).toBe('["First line","","Third line",""]');
    expect(entries[0]?.sourcePath).toBe('front_text.messages');
    expect(entries[0]?.tags).toContain('sign-message-array');
    expect(entries[0]?.tags).toContain('whole-json');
  });

  it('combines styled sign messages into one JSON array entry', () => {
    const entries = extract({
      type: 'compound',
      value: {
        messages: {
          type: 'list',
          value: [
            '{"text":"First","color":"gold"}',
            '[{"text":"Second"},{"text":" line","bold":true}]',
            '""',
            '"Plain fourth"',
          ],
        },
      },
    });

    expect(entries).toHaveLength(1);
    expect(entries[0]?.original).toBe(
      '[{"text":"First","color":"gold"},[{"text":"Second"},{"text":" line","bold":true}],"","Plain fourth"]',
    );
    expect(entries[0]?.sourcePath).toBe('messages');
    expect(entries[0]?.tags).toContain('sign-message-array');
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

  it('attaches entity Pos coordinates to nested text', () => {
    const entries = extract({
      type: 'compound',
      value: {
        Pos: { type: 'list', value: [12.5, 64, -3.25] },
        CustomName: { type: 'string', value: '{"text":"Wandering trader"}' },
      },
    });

    expect(entries[0]?.position).toEqual({
      x: 12.5,
      y: 64,
      z: -3.25,
      source: 'Pos',
    });
  });

  it('attaches block entity x y z coordinates to nested text', () => {
    const entries = extract({
      type: 'compound',
      value: {
        x: { type: 'int', value: -8 },
        y: { type: 'int', value: 70 },
        z: { type: 'int', value: 24 },
        front_text: {
          type: 'compound',
          value: {
            messages: {
              type: 'list',
              value: ['"Line one"', '""', '""', '""'],
            },
          },
        },
      },
    });

    expect(entries[0]?.position).toEqual({
      x: -8,
      y: 70,
      z: 24,
      source: 'x y z',
    });
  });

  it('uses structure pos coordinates for sibling NBT data', () => {
    const entries = extract({
      type: 'compound',
      value: {
        pos: { type: 'list', value: [1, 2, 3] },
        nbt: {
          type: 'compound',
          value: {
            CustomName: { type: 'string', value: '"Structure block"' },
          },
        },
      },
    });

    expect(entries[0]?.position).toEqual({
      x: 1,
      y: 2,
      z: 3,
      source: 'pos',
    });
  });
});
