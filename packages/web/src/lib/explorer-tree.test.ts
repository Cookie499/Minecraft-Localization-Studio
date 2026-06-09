import { describe, expect, it } from 'vitest';
import type { TranslationEntry } from '@mls/core';
import { buildExplorerTree, getMcaLocation, matchesExplorerSelection } from './explorer-tree';

function entry(sourceFile: string): TranslationEntry {
  return {
    id: sourceFile,
    projectId: 'project',
    key: sourceFile,
    original: 'Text',
    translation: '',
    sourceFile,
    sourceType: 'mca',
    sourcePath: 'path',
    context: [],
    references: [],
    tags: [],
    status: 'untranslated',
    aiGenerated: false,
  };
}

describe('MCA explorer grouping', () => {
  it('detects standard and custom dimensions', () => {
    expect(getMcaLocation('save/region/r.0.0.mca')?.dimension).toBe('overworld');
    expect(getMcaLocation('save/DIM-1/entities/r.0.0.mca')?.dimension).toBe('DIM-1');
    expect(getMcaLocation('save/DIM1/region/r.0.0.mca')?.dimension).toBe('DIM1');
    expect(getMcaLocation(
      'save/dimensions/mod/moon/region/r.0.0.mca',
    )?.dimension).toBe('mod:moon');
  });

  it('builds dimension and category nodes', () => {
    const tree = buildExplorerTree([
      entry('save/region/r.0.0.mca'),
      entry('save/entities/r.0.0.mca'),
      entry('save/DIM-1/region/r.0.0.mca'),
    ]);
    const mca = tree.children?.find((node) => node.sourceType === 'mca');

    expect(mca?.children?.map((node) => node.label)).toEqual(['Nether', 'Overworld']);
    expect(mca?.children?.find((node) => node.label === 'Overworld')
      ?.children?.map((node) => node.label)).toEqual(['Entities', 'Region']);
  });

  it('filters a selected dimension category', () => {
    expect(matchesExplorerSelection(
      entry('save/DIM-1/entities/r.0.0.mca'),
      { kind: 'mca-group', dimension: 'DIM-1', category: 'entities' },
    )).toBe(true);
    expect(matchesExplorerSelection(
      entry('save/DIM-1/region/r.0.0.mca'),
      { kind: 'mca-group', dimension: 'DIM-1', category: 'entities' },
    )).toBe(false);
  });
});
