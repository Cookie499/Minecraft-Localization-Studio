import { describe, expect, it } from 'vitest';
import type { VirtualFileTree } from '../types/virtual-file.js';
import { extractLootTables } from './json-text.js';
import { extractMcFunctions } from './mcfunction.js';

describe('data pack path compatibility', () => {
  it('supports modern singular directories and nested functions', () => {
    const tree: VirtualFileTree = [
      {
        path: 'pack/data/demo/function/ui/start.mcfunction',
        content: 'tellraw @a {"text":"Function text"}',
        isBinary: false,
      },
      {
        path: 'pack/data/demo/loot_table/chests/start.json',
        content: JSON.stringify({
          functions: [{
            function: 'minecraft:set_name',
            name: { text: 'Loot text' },
          }],
        }),
        isBinary: false,
      },
    ];

    expect(extractMcFunctions(tree, 'project').map((entry) => entry.original))
      .toContain('{"text":"Function text"}');
    expect(extractLootTables(tree, 'project').map((entry) => entry.original))
      .toContain('Loot text');
  });
});
