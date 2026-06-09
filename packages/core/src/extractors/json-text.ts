import type { TranslationEntry } from '../types/translation-entry.js';
import type { VirtualFileTree } from '../types/virtual-file.js';
import { getFileText, listFiles } from '../types/virtual-file.js';
import { extractedDisplayText, extractStrings } from '../text-component/index.js';
import { createEntry } from './base.js';

const ADVANCEMENT_PATTERN = /data\/[^/]+\/(advancement|advancements)\/.+\.json$/i;
const LOOT_PATTERN = /data\/[^/]+\/loot_tables\/.+\.json$/i;
const MCMETA_PATTERN = /pack\.mcmeta$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function addComponentEntries(
  value: unknown,
  path: string,
  filePath: string,
  projectId: string,
  sourceType: string,
  entries: TranslationEntry[],
): void {
  if (typeof value === 'string') {
    if (value.length > 0) {
      entries.push(createEntry(projectId, {
        original: value,
        sourceFile: filePath,
        sourceType,
        sourcePath: path,
        tags: [sourceType, 'text-component'],
      }));
    }
    return;
  }

  for (const item of extractStrings(value)) {
    const original = extractedDisplayText(item);
    if (!original) continue;
    entries.push(createEntry(projectId, {
      original,
      sourceFile: filePath,
      sourceType,
      sourcePath: `${path}${item.path}`,
      references: item.translateKey ? [item.translateKey] : [],
      tags: [sourceType, item.isTranslateKey ? 'translate-key' : 'text-component'],
    }));
  }
}

function parseJsonFiles(
  tree: VirtualFileTree,
  pattern: RegExp,
  visit: (json: unknown, filePath: string, entries: TranslationEntry[]) => void,
): TranslationEntry[] {
  const entries: TranslationEntry[] = [];
  for (const file of listFiles(tree, pattern)) {
    const text = getFileText(file);
    if (text === null) continue;
    try {
      visit(JSON.parse(text), file.path, entries);
    } catch {
      // Invalid JSON files are ignored by extractors and preserved by builders.
    }
  }
  return entries;
}

export function extractPackMcmeta(tree: VirtualFileTree, projectId: string): TranslationEntry[] {
  return parseJsonFiles(tree, MCMETA_PATTERN, (json, filePath, entries) => {
    if (!isRecord(json) || !isRecord(json.pack)) return;
    addComponentEntries(json.pack.description, 'pack.description', filePath, projectId, 'pack.mcmeta', entries);
  });
}

export function extractAdvancements(tree: VirtualFileTree, projectId: string): TranslationEntry[] {
  return parseJsonFiles(tree, ADVANCEMENT_PATTERN, (json, filePath, entries) => {
    if (!isRecord(json) || !isRecord(json.display)) return;
    addComponentEntries(json.display.title, 'display.title', filePath, projectId, 'advancement', entries);
    addComponentEntries(json.display.description, 'display.description', filePath, projectId, 'advancement', entries);
  });
}

function visitLootText(
  value: unknown,
  path: string,
  filePath: string,
  projectId: string,
  entries: TranslationEntry[],
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      visitLootText(item, `${path}[${index}]`, filePath, projectId, entries));
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (key === 'name' || key === 'lore') {
      if (Array.isArray(child)) {
        child.forEach((item, index) =>
          addComponentEntries(item, `${childPath}[${index}]`, filePath, projectId, 'loot_table', entries));
      } else {
        addComponentEntries(child, childPath, filePath, projectId, 'loot_table', entries);
      }
    } else {
      visitLootText(child, childPath, filePath, projectId, entries);
    }
  }
}

export function extractLootTables(tree: VirtualFileTree, projectId: string): TranslationEntry[] {
  return parseJsonFiles(tree, LOOT_PATTERN, (json, filePath, entries) => {
    visitLootText(json, '', filePath, projectId, entries);
  });
}
