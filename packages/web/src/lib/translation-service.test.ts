import { describe, expect, it } from 'vitest';
import type { TranslationEntry } from '@mls/core';
import {
  buildDeepSeekUserContent,
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
  });
});
