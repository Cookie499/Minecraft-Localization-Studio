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
  it('extracts only the JSON payload from an execute-wrapped title command', () => {
    const payload = '[{"color":"red","text":"You"},'
      + '{"color":"white","text":" decided to fulfill your "},'
      + '{"color":"red","text":"duty"},{"color":"white","text":""}]';
    const command = 'execute in minecraft:overworld '
      + 'if score $endingTimer count matches 40 '
      + `run title @a[team=Red] subtitle ${payload}`;
    const entries = extractMcFunctions(treeWith(command), 'project');

    expect(entries).toHaveLength(1);
    expect(entries[0]?.original).toBe(payload);
    expect(entries[0]?.original).not.toContain('ld if score');
    expect(entries[0]?.tags).toContain('whole-json');
  });

  it('extracts and replaces item custom_name and lore components', async () => {
    const command = 'execute if score $arcadeTickets count matches 30 run item replace block '
      + '-209 113 66 container.0 with minecraft:paper['
      + 'custom_name=\'{"color":"yellow","italic":false,"text":"Arcade Ticket"}\','
      + 'lore=[\'{"color":"light_purple","italic":false,"text":"Arcade Currency"}\','
      + '\'" "\','
      + '\'[{"color":"gray","italic":false,"text":"Can be redeemed at the "},'
      + '{"color":"red","italic":false,"text":"Prize Vendor "}]\''
      + ']] 30';
    const tree = treeWith(command);
    const entries = extractMcFunctions(tree, 'project');

    expect(entries.map((entry) => entry.sourcePath)).toEqual([
      'line:1/item:custom_name',
      'line:1/item:lore:0',
      'line:1/item:lore:1',
      'line:1/item:lore:2',
    ]);
    expect(entries[0]?.original).toContain('Arcade Ticket');
    expect(entries[2]?.original).toBe('" "');

    entries[0]!.translation =
      '{"color":"yellow","italic":false,"text":"游戏厅奖券"}';
    entries[2]!.translation = '" · "';
    const patched = await buildPatchedTree(tree, entries);
    const output = String(patched[0]?.content);

    expect(output).toContain(
      'custom_name=\'{"color":"yellow","italic":false,"text":"游戏厅奖券"}\'',
    );
    expect(output).toContain('lore=[\'{"color":"light_purple"');
    expect(output).toContain('\'" · "\'');
    expect(output).toMatch(/\]\] 30$/);
  });
});
