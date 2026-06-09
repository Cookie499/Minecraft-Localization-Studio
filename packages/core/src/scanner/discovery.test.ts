import { describe, expect, it } from 'vitest';
import type { VirtualFileTree } from '../types/virtual-file.js';
import {
  discoverScanTargets,
  filterTreeBySelection,
  filterTreeByTargets,
} from './discovery.js';

const tree: VirtualFileTree = [
  { path: 'packs/demo/pack.mcmeta', content: '{}', isBinary: false },
  { path: 'packs/demo/assets/demo/lang/en_us.json', content: '{}', isBinary: false },
  { path: 'packs/demo/assets/demo/lang/zh_cn.json', content: '{}', isBinary: false },
  { path: 'packs/demo/assets/demo/lang/ja_jp.json', content: '{}', isBinary: false },
  { path: 'packs/demo/assets/demo/textures/icon.png', content: new Uint8Array(), isBinary: true },
  { path: 'saves/world/level.dat', content: new Uint8Array(), isBinary: true },
  { path: 'saves/world/region/r.0.0.mca', content: new Uint8Array(), isBinary: true },
];

describe('scan discovery', () => {
  it('discovers packs, saves, and individual language files', () => {
    const discovery = discoverScanTargets(tree);
    const pack = discovery.targets.find((target) => target.kind === 'resource-pack');
    const save = discovery.targets.find((target) => target.kind === 'save');

    expect(pack?.rootPath).toBe('packs/demo');
    expect(pack?.langFiles.map((file) => file.locale)).toEqual(['en_us', 'ja_jp', 'zh_cn']);
    expect(save?.rootPath).toBe('saves/world');
  });

  it('keeps only selected targets and selected language files', () => {
    const discovery = discoverScanTargets(tree);
    const pack = discovery.targets.find((target) => target.kind === 'resource-pack')!;
    const filtered = filterTreeBySelection(tree, discovery, {
      targetIds: [pack.id],
      langPlans: [],
    });

    expect(filtered.some((file) => file.path.endsWith('en_us.json'))).toBe(false);
    expect(filtered.some((file) => file.path.endsWith('zh_cn.json'))).toBe(false);
    expect(filtered.some((file) => file.path.endsWith('ja_jp.json'))).toBe(false);
    expect(filtered.some((file) => file.path.endsWith('pack.mcmeta'))).toBe(true);
    expect(filtered.some((file) => file.path.includes('/region/'))).toBe(false);
  });

  it('keeps unselected language files in the build tree', () => {
    const discovery = discoverScanTargets(tree);
    const pack = discovery.targets.find((target) => target.kind === 'resource-pack')!;
    const buildTree = filterTreeByTargets(tree, discovery, [pack.id]);

    expect(buildTree.some((file) => file.path.endsWith('ja_jp.json'))).toBe(true);
    expect(buildTree.some((file) => file.path.includes('/region/'))).toBe(false);
  });
});
