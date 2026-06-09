import { describe, expect, it } from 'vitest';
import { createEntry } from '../extractors/base.js';
import type { VirtualFileTree } from '../types/virtual-file.js';
import { buildPatchedTree } from './json-patch.js';

describe('buildPatchedTree', () => {
  it('replaces literal components with stable keys and emits language files', () => {
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

    const built = buildPatchedTree(tree, [title, description], {
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

  it('creates the target lang file and leaves the source lang file unchanged', () => {
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

    const built = buildPatchedTree(tree, [entry]);
    const source = built.find((file) => file.path === sourcePath);
    const target = built.find((file) => file.path === targetPath);
    expect(source?.content).toBe(sourceContent);
    expect(JSON.parse(String(target?.content))).toEqual({ 'item.demo.name': 'New text' });
    expect(built.some((file) => file.path === 'assets/mls/lang/en_us.json')).toBe(false);
  });
});
