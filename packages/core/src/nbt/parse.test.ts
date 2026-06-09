import nbt from 'prismarine-nbt';
import { gzip } from 'pako';
import { describe, expect, it } from 'vitest';
import { parseNbt } from './parse.js';
import { extractFromNbtTree } from './traverse.js';

function makeNbt(): Uint8Array {
  return new Uint8Array(nbt.writeUncompressed({
    type: 'compound',
    name: '',
    value: {
      CustomName: {
        type: 'string',
        value: '{"text":"Hello from NBT"}',
      },
    },
  }));
}

describe('parseNbt', () => {
  it('parses Uint8Array input and extracts text', async () => {
    const root = await parseNbt(makeNbt());
    const entries: Parameters<typeof extractFromNbtTree>[5] = [];

    extractFromNbtTree(root, '', 'level.dat', 'project', 'level.dat', entries);

    expect(entries.map((entry) => entry.original)).toContain('Hello from NBT');
  });

  it('parses gzip-compressed Java NBT', async () => {
    const root = await parseNbt(gzip(makeNbt()));
    const entries: Parameters<typeof extractFromNbtTree>[5] = [];

    extractFromNbtTree(root, '', 'level.dat', 'project', 'level.dat', entries);

    expect(entries.map((entry) => entry.original)).toContain('Hello from NBT');
  });
});
