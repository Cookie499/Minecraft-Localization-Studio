import { describe, expect, it } from 'vitest';
import nbt from 'prismarine-nbt';
import { gzip, ungzip } from 'pako';
import { createEntry } from '../extractors/base.js';
import { parseNbt } from '../nbt/parse.js';
import type { VirtualFileTree } from '../types/virtual-file.js';
import { buildPatchedTree } from './json-patch.js';

describe('buildPatchedTree', () => {
  it('replaces literal components with stable keys and emits language files', async () => {
    const tree: VirtualFileTree = [{
      path: 'data/demo/advancements/start.json',
      content: JSON.stringify({
        display: {
          title: { text: 'Welcome Adventurer' },
          description: 'Begin the journey',
        },
      }),
      isBinary: false,
    }];
    const title = createEntry('project', {
      original: 'Welcome Adventurer',
      sourceFile: tree[0]!.path,
      sourceType: 'advancement',
      sourcePath: 'display.title/text',
      tags: ['advancement', 'text-component'],
    });
    const description = createEntry('project', {
      original: 'Begin the journey',
      sourceFile: tree[0]!.path,
      sourceType: 'advancement',
      sourcePath: 'display.description',
      tags: ['advancement', 'text-component'],
    });
    title.translation = 'Welcome, adventurer';
    description.translation = 'Start the journey';

    const built = await buildPatchedTree(tree, [title, description], {
      sourceLocale: 'en_us',
      targetLocale: 'zh_cn',
    });
    const patched = built.find((file) => file.path === tree[0]!.path);
    const json = JSON.parse(String(patched?.content));
    expect(json.display.title).toEqual({ translate: title.key });
    expect(json.display.description).toEqual({ translate: description.key });

    const target = built.find((file) => file.path === 'assets/mls/lang/zh_cn.json');
    expect(JSON.parse(String(target?.content))).toEqual({
      [title.key]: 'Welcome, adventurer',
      [description.key]: 'Start the journey',
    });
  });

  it('creates the target lang file and leaves the source lang file unchanged', async () => {
    const sourcePath = 'assets/demo/lang/en_us.json';
    const targetPath = 'assets/demo/lang/zh_cn.json';
    const sourceContent = JSON.stringify({ 'item.demo.name': 'Old text' });
    const tree: VirtualFileTree = [{
      path: sourcePath,
      content: sourceContent,
      isBinary: false,
    }];
    const entry = createEntry('project', {
      key: 'item.demo.name',
      original: 'Old text',
      sourceFile: targetPath,
      sourceType: 'lang',
      sourcePath: 'item.demo.name',
      tags: ['resource-pack', 'lang', 'source-locale:en_us', 'locale:zh_cn'],
    });
    entry.translation = 'New text';

    const built = await buildPatchedTree(tree, [entry]);
    const source = built.find((file) => file.path === sourcePath);
    const target = built.find((file) => file.path === targetPath);
    expect(source?.content).toBe(sourceContent);
    expect(JSON.parse(String(target?.content))).toEqual({ 'item.demo.name': 'New text' });
    expect(built.some((file) => file.path === 'assets/mls/lang/en_us.json')).toBe(false);
  });

  it('writes translated text back to gzip-compressed NBT files', async () => {
    const path = 'world/level.dat';
    const source = new Uint8Array(nbt.writeUncompressed({
      type: 'compound',
      name: '',
      value: {
        LevelName: { type: 'string', value: 'Original world' },
      },
    }));
    const tree: VirtualFileTree = [{
      path,
      content: gzip(source),
      isBinary: true,
    }];
    const entry = createEntry('project', {
      original: 'Original world',
      sourceFile: path,
      sourceType: 'level.dat',
      sourcePath: 'LevelName',
    });
    entry.translation = 'Translated world';

    const built = await buildPatchedTree(tree, [entry]);
    const patched = built.find((file) => file.path === path);
    expect(patched?.content).toBeInstanceOf(Uint8Array);
    const bytes = patched!.content as Uint8Array;
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x1f, 0x8b]);

    const root = await parseNbt(ungzip(bytes));
    const levelName = (root.value as Record<string, { value: string }>).LevelName;
    expect(levelName?.value).toBe('Translated world');
  });
});
