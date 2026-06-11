import { describe, expect, it } from 'vitest';
import nbt from 'prismarine-nbt';
import { deflate } from 'pako';
import type { VirtualFileTree } from '../types/virtual-file.js';
import { findMcaFiles } from './mca.js';
import { extractFromMcaFile, patchMcaFile } from '../mca/parse.js';

function makeMca(): Uint8Array {
  const nbtBytes = new Uint8Array(nbt.writeUncompressed({
    type: 'compound',
    name: '',
    value: {
      CustomName: {
        type: 'string',
        value: '{"text":"Root","extra":[{"text":" Extra"}]}',
      },
    },
  }));
  const compressed = deflate(nbtBytes);
  const storedLength = compressed.length + 1;
  const chunkSectors = Math.ceil((storedLength + 4) / 4096);
  const data = new Uint8Array((2 + chunkSectors) * 4096);
  const view = new DataView(data.buffer);
  view.setUint32(0, (2 << 8) | chunkSectors, false);
  view.setUint32(4096, 123456, false);
  view.setInt32(8192, storedLength, false);
  data[8196] = 2;
  data.set(compressed, 8197);
  return data;
}

describe('findMcaFiles', () => {
  it('matches chunk region and entity region files in every dimension', () => {
    const tree: VirtualFileTree = [
      { path: 'world/region/r.0.0.mca', content: new Uint8Array(), isBinary: true },
      { path: 'world/entities/r.-1.2.mca', content: new Uint8Array(), isBinary: true },
      { path: 'world/DIM-1/region/r.3.-4.mca', content: new Uint8Array(), isBinary: true },
      { path: 'world/poi/r.0.0.mca', content: new Uint8Array(), isBinary: true },
    ];

    expect(findMcaFiles(tree).map((file) => file.path)).toEqual([
      'world/region/r.0.0.mca',
      'world/entities/r.-1.2.mca',
      'world/DIM-1/region/r.3.-4.mca',
    ]);
  });

  it('patches a complete JSON text component and preserves timestamps', async () => {
    const source = makeMca();
    const entries = await extractFromMcaFile(source, 'world/region/r.0.0.mca', 'project');
    const component = entries.find(
      (entry) => entry.original === '{"text":"Root","extra":[{"text":" Extra"}]}',
    );
    expect(component).toBeDefined();
    component!.translation = '{"text":"Translated root","extra":[{"text":" Translated"}]}';

    const patched = await patchMcaFile(source, [component!]);
    expect(patched.applied).toBe(1);
    expect(new DataView(patched.data.buffer).getUint32(4096, false)).toBe(123456);

    const reparsed = await extractFromMcaFile(
      patched.data,
      'world/region/r.0.0.mca',
      'project',
    );
    expect(reparsed.map((entry) => entry.original)).toEqual([
      '{"text":"Translated root","extra":[{"text":" Translated"}]}',
    ]);
  });
});
