import { describe, expect, it } from 'vitest';
import type { TranslationEntry } from '@mls/core';
import {
  buildDeepSeekSystemPrompt,
  buildDeepSeekUserContent,
  cleanTranslation,
  DEFAULT_TRANSLATION_SETTINGS,
  findGlossaryMatches,
} from './translation-service';

const entry: TranslationEntry = {
  id: 'entry',
  projectId: 'project',
  key: 'demo.quest_block',
  original: 'Complete the Block Quest',
  translation: '',
  sourceFile: 'demo.json',
  sourceType: 'advancement',
  sourcePath: 'display.title',
  context: ['title'],
  references: [],
  tags: [],
  status: 'untranslated',
  aiGenerated: false,
};

describe('AI translation glossary', () => {
  it('matches case-insensitively, removes duplicates, and prefers longer terms', () => {
    const matches = findGlossaryMatches('Complete the Block Quest', [
      { source: 'quest', translation: '任务' },
      { source: 'Block Quest', translation: '方块任务' },
      { source: 'QUEST', translation: '重复任务' },
      { source: 'Biome', translation: '生物群系' },
    ]);

    expect(matches).toEqual([
      { source: 'Block Quest', translation: '方块任务' },
      { source: 'quest', translation: '任务' },
    ]);
  });

  it('adds only matched terminology suggestions to the AI user content', () => {
    const content = buildDeepSeekUserContent(entry, {
      ...DEFAULT_TRANSLATION_SETTINGS,
      glossary: [
        { source: 'Block', translation: '方块' },
        { source: 'Quest', translation: '任务' },
        { source: 'Biome', translation: '生物群系' },
      ],
    });

    expect(content).toContain('"Block" -> "方块"');
    expect(content).toContain('"Quest" -> "任务"');
    expect(content).not.toContain('Biome');
    expect(content).toContain(entry.original);
    expect(content).toContain('BEGIN COMPLETE SOURCE');
    expect(content).toContain('Return the entire source');
  });

  it('adds mandatory command-preservation rules for mcfunction entries', () => {
    const prompt = buildDeepSeekSystemPrompt(
      DEFAULT_TRANSLATION_SETTINGS,
      {
        ...entry,
        sourceType: 'mcfunction',
      },
    );

    expect(prompt).toContain('Never omit, summarize, shorten, reorder');
    expect(prompt).toContain('score $theatreAct count matches 3');
    expect(prompt).toContain('The incorrect output is forbidden');
  });

  it('does not force source-format quotes onto translated text', () => {
    expect(cleanTranslation('"Translated text"')).toBe('Translated text');
    expect(cleanTranslation('Translated text')).toBe('Translated text');
  });

  it('explicitly requires translation inside outer ASCII quotes', () => {
    const quotedEntry = {
      ...entry,
      original: '"It can also be set to stop outputting a signal."',
    };
    const content = buildDeepSeekUserContent(
      quotedEntry,
      DEFAULT_TRANSLATION_SETTINGS,
    );
    const prompt = buildDeepSeekSystemPrompt(
      DEFAULT_TRANSLATION_SETTINGS,
      quotedEntry,
    );

    expect(prompt).toContain('translate all natural-language content inside them');
    expect(content).toContain('outer quotes have already been removed');
    expect(content).toContain('Return only the translated text');
    expect(content).toContain(
      'TEXT THAT MUST BE TRANSLATED: It can also be set to stop outputting a signal.',
    );
    expect(content).toContain(
      'BEGIN COMPLETE SOURCE\nIt can also be set to stop outputting a signal.\nEND COMPLETE SOURCE',
    );
    expect(content).not.toContain(
      'BEGIN COMPLETE SOURCE\n"It can also be set to stop outputting a signal."\nEND COMPLETE SOURCE',
    );
  });

  it('removes added wrapping quotes from an unquoted source', () => {
    expect(cleanTranslation('"译文"')).toBe('译文');
  });
});
