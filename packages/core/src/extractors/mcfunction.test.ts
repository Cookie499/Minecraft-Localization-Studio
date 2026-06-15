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
  it('extracts a complete quoted tellraw command as one entry', () => {
    const payload = '[{"color":"white","text":"<"},{"color":"#00FFD5","text":"T"},'
      + '{"selector":"@p[team=Red]"},{"color":"white","text":"submitted their vote"}]';
    const command = `tellraw @a ${payload}`;
    const entries = extractMcFunctions(treeWith(command), 'project');

    expect(entries).toHaveLength(1);
    expect(entries[0]?.original).toBe(command);
    expect(entries[0]?.sourcePath).toBe('line:1');
    expect(entries[0]?.tags).toContain('whole-command');
  });

  it('extracts and replaces a continued quoted command as one entry', async () => {
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
      'tellraw @a [{"color":"white","text":"<"},{"color":"#00FFD5","text":"T"},'
      + '{"color":"white","text":"submitted their vote"}]',
    );

    entries[0]!.translation =
      'tellraw @a [{"color":"white","text":"<"},{"color":"#00FFD5","text":"T"},'
      + '{"color":"white","text":"submitted the translated vote"}]';
    const patched = await buildPatchedTree(tree, entries);

    expect(patched[0]?.content).toBe(entries[0]!.translation);
  });

  it('extracts the complete execute-wrapped title command', () => {
    const payload = '[{"color":"red","text":"You"},'
      + '{"color":"white","text":" decided to fulfill your "},'
      + '{"color":"red","text":"duty"}]';
    const command = 'execute in minecraft:overworld '
      + 'if score $endingTimer count matches 40 '
      + `run title @a[team=Red] subtitle ${payload}`;
    const entries = extractMcFunctions(treeWith(command), 'project');

    expect(entries).toHaveLength(1);
    expect(entries[0]?.original).toBe(command);
    expect(entries[0]?.tags).toContain('whole-command');
  });

  it('extracts and replaces a complete quoted item command', async () => {
    const command = 'execute if score $arcadeTickets count matches 30 run item replace block '
      + '-209 113 66 container.0 with minecraft:paper['
      + 'custom_name=\'{"color":"yellow","italic":false,"text":"Arcade Ticket"}\','
      + 'lore=[\'{"color":"light_purple","italic":false,"text":"Arcade Currency"}\','
      + '\'" "\']] 30';
    const tree = treeWith(command);
    const entries = extractMcFunctions(tree, 'project');

    expect(entries).toHaveLength(1);
    expect(entries[0]?.original).toBe(command);
    expect(entries[0]?.tags).toContain('whole-command');

    entries[0]!.translation = command
      .replace('Arcade Ticket', 'Translated Ticket')
      .replace('Arcade Currency', 'Translated Currency');
    const patched = await buildPatchedTree(tree, entries);

    expect(patched[0]?.content).toBe(entries[0]!.translation);
  });

  it('extracts quoted data, component, and legacy NBT commands without command rules', () => {
    const commands = [
      'data modify storage demo:state foo.bar set value "Readable text"',
      'give @s minecraft:paper[minecraft:custom_data={label:"Component text"}]',
      'setblock ~ ~ ~ minecraft:chest{CustomName:"Legacy NBT text"}',
    ].join('\n');
    const entries = extractMcFunctions(treeWith(commands), 'project');

    expect(entries.map((entry) => entry.original)).toEqual(commands.split('\n'));
    expect(entries.every((entry) => entry.tags.includes('whole-command'))).toBe(true);
  });

  it('keeps the legacy command-specific extraction for unquoted commands', () => {
    const entries = extractMcFunctions(
      treeWith('team add builders Builder Team'),
      'project',
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]?.original).toBe('Builder Team');
    expect(entries[0]?.tags).toContain('raw');
  });
});
