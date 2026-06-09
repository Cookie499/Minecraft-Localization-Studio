import type { LangTranslationPlan } from '../scanner/discovery.js';
import type { TranslationEntry } from '../types/translation-entry.js';
import type { VirtualFileTree } from '../types/virtual-file.js';
import { findFile, getFileText } from '../types/virtual-file.js';
import { createEntry } from './base.js';

function parseLangFile(tree: VirtualFileTree, path: string): Record<string, string> {
  const file = findFile(tree, path);
  const text = file ? getFileText(file) : null;
  if (text === null) return {};

  try {
    const json = JSON.parse(text) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(json).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ));
  } catch {
    console.warn(`[MLS][lang] invalid JSON: ${path}`);
    return {};
  }
}

export function extractLangPlans(
  tree: VirtualFileTree,
  projectId: string,
  plans: LangTranslationPlan[],
): TranslationEntry[] {
  const entries: TranslationEntry[] = [];

  for (const plan of plans) {
    const source = parseLangFile(tree, plan.sourcePath);
    const target = parseLangFile(tree, plan.targetPath);
    const targetExists = findFile(tree, plan.targetPath) !== undefined;

    for (const [key, original] of Object.entries(source)) {
      if (!original) continue;
      const existing = target[key];
      const entry = createEntry(projectId, {
        key,
        original,
        sourceFile: plan.targetPath,
        sourceType: 'lang',
        sourcePath: key,
        context: [
          `namespace:${plan.namespace}`,
          `source:${plan.sourceLocale}`,
          `target:${plan.targetLocale}`,
          `sourceFile:${plan.sourcePath}`,
        ],
        tags: [
          'resource-pack',
          'lang',
          `source-locale:${plan.sourceLocale}`,
          `locale:${plan.targetLocale}`,
        ],
      });
      entry.translation = existing ?? original;
      entry.status = targetExists && existing !== undefined && existing !== original
        ? 'translated'
        : 'untranslated';
      entries.push(entry);
    }

    console.info(
      `[MLS][lang] ${plan.sourceLocale} -> ${plan.targetLocale} ` +
      `(${plan.namespace}): ${Object.keys(source).length} entries`,
    );
  }

  return entries;
}
