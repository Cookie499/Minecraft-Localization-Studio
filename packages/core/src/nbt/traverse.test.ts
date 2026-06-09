import { describe, expect, it } from 'vitest';
import { extractFromNbtTree } from './traverse.js';
import type { TranslationEntry } from '../types/translation-entry.js';

function extract(node: unknown): TranslationEntry[] {
  const entries: TranslationEntry[] = [];
  extractFromNbtTree(node, '', 'region/r.0.0.mca', 'project', 'mca', entries);
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
      'Named chest',
      'Display text',
      'Modern name',
      'Unknown mod text',
    ]);
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
      'Lore line',
      'Second line',
      'Book page',
    ]);
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
