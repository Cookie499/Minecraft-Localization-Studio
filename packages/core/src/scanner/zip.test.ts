import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { buildPatchedTree } from '../builder/json-patch.js';
import { exportTreeAsZip } from '../builder/zip-export.js';
import { extractMcFunctions } from '../extractors/mcfunction.js';
import type { VirtualFileTree } from '../types/virtual-file.js';
import { expandNestedDataPackZips } from './zip.js';

async function nestedDataPack(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file('pack.mcmeta', '{"pack":{"description":"Demo"}}');
  zip.file('data/demo/functions/start.mcfunction', 'say hello');
  return zip.generateAsync({ type: 'uint8array' });
}

describe('nested data pack ZIP scanning', () => {
  it('expands valid data packs inside a save', async () => {
    const tree: VirtualFileTree = [{
      path: 'world/datapacks/demo.zip',
      content: await nestedDataPack(),
      isBinary: true,
    }];

    const expanded = await expandNestedDataPackZips(tree);

    expect(expanded.map((file) => file.path)).toContain(
      'world/datapacks/demo.zip!/pack.mcmeta',
    );
    expect(expanded.map((file) => file.path)).toContain(
      'world/datapacks/demo.zip!/data/demo/functions/start.mcfunction',
    );
  });

  it('repackages virtual nested files during export', async () => {
    const tree = await expandNestedDataPackZips([{
      path: 'world/datapacks/demo.zip',
      content: await nestedDataPack(),
      isBinary: true,
    }]);
    const functionFile = tree.find((file) => file.path.endsWith('start.mcfunction'))!;
    functionFile.content = 'say translated';

    const exported = await exportTreeAsZip(tree);
    const outer = await JSZip.loadAsync(await exported.arrayBuffer());
    const nestedBytes = await outer.file('world/datapacks/demo.zip')!.async('uint8array');
    const nested = await JSZip.loadAsync(nestedBytes);

    expect(await nested.file('data/demo/functions/start.mcfunction')!.async('string'))
      .toBe('say translated');
    expect(Object.keys(outer.files).some((path) => path.includes('.zip!'))).toBe(false);
  });

  it('writes translations back into a nested data pack before repackaging', async () => {
    const tree = await expandNestedDataPackZips([{
      path: 'world/datapacks/demo.zip',
      content: await nestedDataPack(),
      isBinary: true,
    }]);
    const functionFile = tree.find((file) => file.path.endsWith('start.mcfunction'))!;
    functionFile.content = 'tellraw @a {"text":"hello"}';
    const entries = extractMcFunctions(tree, 'project');
    entries[0]!.translation = '{"text":"你好"}';

    const patched = await buildPatchedTree(tree, entries);
    const exported = await exportTreeAsZip(patched);
    const outer = await JSZip.loadAsync(await exported.arrayBuffer());
    const nestedBytes = await outer.file('world/datapacks/demo.zip')!.async('uint8array');
    const nested = await JSZip.loadAsync(nestedBytes);

    expect(await nested.file('data/demo/functions/start.mcfunction')!.async('string'))
      .toBe('tellraw @a {"text":"你好"}');
    expect(Object.keys(outer.files).some((path) => path.includes('.zip!'))).toBe(false);
  });
});
