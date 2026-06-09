import { describe, expect, it } from 'vitest';
import type { LangTranslationPlan } from '../scanner/discovery.js';
import type { VirtualFileTree } from '../types/virtual-file.js';
import { extractLangPlans } from './lang.js';

const sourcePath = 'pack/assets/demo/lang/en_us.json';
const targetPath = 'pack/assets/demo/lang/zh_cn.json';
const plan: LangTranslationPlan = {
  targetId: 'resource-pack:pack',
  namespace: 'demo',
  sourceLocale: 'en_us',
  sourcePath,
  targetLocale: 'zh_cn',
  targetPath,
};

describe('extractLangPlans', () => {
  it('copies source values into a new target translation list', () => {
    const tree: VirtualFileTree = [{
      path: sourcePath,
      content: JSON.stringify({ 'item.demo.name': 'Demo Item' }),
      isBinary: false,
    }];

    const entries = extractLangPlans(tree, 'project', [plan]);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      key: 'item.demo.name',
      original: 'Demo Item',
      translation: 'Demo Item',
      sourceFile: targetPath,
      status: 'untranslated',
    });
  });

  it('loads existing target values as translations', () => {
    const tree: VirtualFileTree = [
      {
        path: sourcePath,
        content: JSON.stringify({ 'item.demo.name': 'Demo Item' }),
        isBinary: false,
      },
      {
        path: targetPath,
        content: JSON.stringify({ 'item.demo.name': 'Translated Item' }),
        isBinary: false,
      },
    ];

    const entries = extractLangPlans(tree, 'project', [plan]);
    expect(entries[0]).toMatchObject({
      original: 'Demo Item',
      translation: 'Translated Item',
      status: 'translated',
    });
  });
});
