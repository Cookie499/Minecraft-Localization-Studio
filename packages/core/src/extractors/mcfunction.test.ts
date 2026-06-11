import { describe, expect, it } from 'vitest';
import type { VirtualFileTree } from '../types/virtual-file.js';
import { buildPatchedTree } from '../builder/json-patch.js';
import { extractMcFunctions } from './mcfunction.js';

function treeWith(content: string): VirtualFileTree {
  return [{
    path: 'pack/data/demo/function/ui/start.mcfunction',
    content,
    isBinary: false,
  }];
}

describe('extractMcFunctions', () => {
  it('extracts a complete tellraw JSON payload as one entry', () => {
    const payload = '[{"color":"white","text":"<"},{"color":"#00FFD5","text":"T"},'
      + '{"selector":"@p[team=Red]"},{"color":"white","text":"submitted their vote"}]';
    const entries = extractMcFunctions(treeWith(`tellraw @a ${payload}`), 'project');

    expect(entries).toHaveLength(1);
    expect(entries[0]?.original).toBe(payload);
    expect(entries[0]?.sourcePath).toBe('line:1');
    expect(entries[0]?.tags).toContain('whole-json');
  });

  it('extracts and replaces a backslash-continued command as one entry', async () => {
    const source = [
      'tellraw @a [{"color":"white","text":"<"},\\',
      '  {"color":"#00FFD5","text":"T"},\\',
      '  {"color":"white","text":"submitted their vote"}]',
    ].join('\n');
    const tree = treeWith(source);
    const entries = extractMcFunctions(tree, 'project');

    expect(entries).toHaveLength(1);
    expect(entries[0]?.sourcePath).toBe('line:1-3');
    expect(entries[0]?.original).toBe(
      '[{"color":"white","text":"<"},{"color":"#00FFD5","text":"T"},'
      + '{"color":"white","text":"submitted their vote"}]',
    );

    entries[0]!.translation =
      '[{"color":"white","text":"<"},{"color":"#00FFD5","text":"T"},'
      + '{"color":"white","text":"提交了他的投票"}]';
    const patched = await buildPatchedTree(tree, entries);

    expect(patched[0]?.content).toBe(
      'tellraw @a [{"color":"white","text":"<"},{"color":"#00FFD5","text":"T"},'
      + '{"color":"white","text":"提交了他的投票"}]',
    );
  });
});
