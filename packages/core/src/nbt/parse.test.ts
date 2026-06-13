import nbt from 'prismarine-nbt';
import { gzip } from 'pako';
import { describe, expect, it } from 'vitest';
import { parseNbt, serializeNbt } from './parse.js';
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

    expect(entries.map((entry) => entry.original)).toContain('{"text":"Hello from NBT"}');
  });

  it('parses gzip-compressed Java NBT', async () => {
    const root = await parseNbt(gzip(makeNbt()));
    const entries: Parameters<typeof extractFromNbtTree>[5] = [];

    extractFromNbtTree(root, '', 'level.dat', 'project', 'level.dat', entries);

    expect(entries.map((entry) => entry.original)).toContain('{"text":"Hello from NBT"}');
  });

  it('round-trips Java Modified UTF-8 supplementary characters and nulls', async () => {
    const root = {
      type: 'compound',
      name: 'root😀',
      value: {
        CustomName: {
          type: 'string',
          value: 'Text 😀 \u0000 end',
        },
      },
    } as const;

    const encoded = await serializeNbt(root);
    const parsed = await parseNbt(encoded);
    const customName = (parsed.value as Record<string, { value: string }>).CustomName!;

    expect(parsed.name).toBe('root😀');
    expect(customName.value).toBe('Text 😀 \u0000 end');
    expect([...encoded].some((byte, index, bytes) =>
      byte === 0xed && bytes[index + 1] === 0xa0 && bytes[index + 2] === 0xbd,
    )).toBe(true);
  });

  it('rejects unpaired surrogates instead of silently replacing them', async () => {
    await expect(serializeNbt({
      type: 'compound',
      name: '',
      value: {
        Broken: {
          type: 'string',
          value: String.fromCharCode(0xd800),
        },
      },
    })).rejects.toThrow('unpaired high surrogate');
  });
});
