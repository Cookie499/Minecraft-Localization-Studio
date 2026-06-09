import { describe, expect, it } from 'vitest';
import type { VirtualFileTree } from '../types/virtual-file.js';
import { findMcaFiles } from './mca.js';

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
});
