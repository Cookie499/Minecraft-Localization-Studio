import type { TranslationEntry } from '../types/translation-entry.js';
import type { VirtualFile, VirtualFileTree } from '../types/virtual-file.js';
import { getFileText } from '../types/virtual-file.js';

export interface BuildOptions {
  sourceLocale?: string;
  targetLocale?: string;
  namespace?: string;
  packFormat?: number;
}

function cloneTree(tree: VirtualFileTree): VirtualFileTree {
  return tree.map((file) => ({
    ...file,
    content: file.content instanceof Uint8Array ? file.content.slice() : file.content,
  }));
}

function pathSegments(path: string): string[] {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split(/[./]/)
    .filter(Boolean);
}

function replaceWithTranslationKey(root: unknown, path: string, key: string): void {
  const segments = pathSegments(path);
  if (segments.length === 0) return;

  let current = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    if (Array.isArray(current)) {
      current = current[Number(segment)];
    } else if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return;
    }
  }

  const last = segments[segments.length - 1]!;
  if (Array.isArray(current)) {
    const index = Number(last);
    current[index] = { translate: key };
    return;
  }
  if (typeof current !== 'object' || current === null) return;

  const record = current as Record<string, unknown>;
  if (last === 'text') {
    delete record.text;
    record.translate = key;
  } else {
    record[last] = { translate: key };
  }
}

function patchJsonFiles(tree: VirtualFileTree, entries: TranslationEntry[]): VirtualFileTree {
  const byFile = new Map<string, TranslationEntry[]>();
  for (const entry of entries) {
    if (!['pack.mcmeta', 'advancement', 'loot_table'].includes(entry.sourceType)) continue;
    if (entry.tags.includes('translate-key')) continue;
    const fileEntries = byFile.get(entry.sourceFile) ?? [];
    fileEntries.push(entry);
    byFile.set(entry.sourceFile, fileEntries);
  }

  return tree.map((file) => {
    const fileEntries = byFile.get(file.path);
    const text = getFileText(file);
    if (!fileEntries?.length || text === null) return file;

    try {
      const json = JSON.parse(text) as unknown;
      for (const entry of fileEntries) {
        replaceWithTranslationKey(json, entry.sourcePath, entry.key);
      }
      return { ...file, content: JSON.stringify(json, null, 2), isBinary: false };
    } catch {
      return file;
    }
  });
}

function languageFile(path: string, values: Record<string, string>): VirtualFile {
  return {
    path,
    content: `${JSON.stringify(values, null, 2)}\n`,
    isBinary: false,
  };
}

function upsertFile(tree: VirtualFileTree, file: VirtualFile): void {
  const index = tree.findIndex((candidate) => candidate.path === file.path);
  if (index >= 0) tree[index] = file;
  else tree.push(file);
}

export function buildLanguageFiles(
  entries: TranslationEntry[],
  options: BuildOptions = {},
): VirtualFileTree {
  const sourceLocale = options.sourceLocale ?? 'en_us';
  const targetLocale = options.targetLocale ?? 'zh_cn';
  const namespace = options.namespace ?? 'mls';
  const source: Record<string, string> = {};
  const target: Record<string, string> = {};

  for (const entry of entries) {
    if (entry.sourceType === 'lang') continue;
    if (entry.tags.includes('translate-key')) continue;
    source[entry.key] = entry.original;
    target[entry.key] = entry.translation || entry.original;
  }

  if (Object.keys(source).length === 0) return [];

  return [
    languageFile(`assets/${namespace}/lang/${sourceLocale}.json`, source),
    languageFile(`assets/${namespace}/lang/${targetLocale}.json`, target),
  ];
}

export function applyLangPatches(
  tree: VirtualFileTree,
  entries: TranslationEntry[],
): VirtualFileTree {
  const byFile = new Map<string, TranslationEntry[]>();
  for (const entry of entries) {
    if (entry.sourceType !== 'lang' || !entry.translation) continue;
    const fileEntries = byFile.get(entry.sourceFile) ?? [];
    fileEntries.push(entry);
    byFile.set(entry.sourceFile, fileEntries);
  }

  const result = cloneTree(tree);
  for (const [path, fileEntries] of byFile) {
    const file = result.find((candidate) => candidate.path === path);
    const text = file ? getFileText(file) : null;
    try {
      const json = text === null ? {} : JSON.parse(text) as Record<string, unknown>;
      for (const entry of fileEntries) {
        json[entry.sourcePath] = entry.translation;
      }
      upsertFile(result, {
        path,
        content: `${JSON.stringify(json, null, 2)}\n`,
        isBinary: false,
      });
    } catch {
      console.warn(`[MLS][build] invalid target Lang JSON: ${path}`);
    }
  }
  return result;
}

export function buildPatchedTree(
  tree: VirtualFileTree,
  entries: TranslationEntry[],
  options: BuildOptions = {},
): VirtualFileTree {
  const result = patchJsonFiles(applyLangPatches(cloneTree(tree), entries), entries);
  for (const file of buildLanguageFiles(entries, options)) {
    upsertFile(result, file);
  }

  const namespace = options.namespace ?? 'mls';
  const packMetaPath = 'pack.mcmeta';
  if (!result.some((file) => file.path === packMetaPath)) {
    upsertFile(result, {
      path: packMetaPath,
      content: `${JSON.stringify({
        pack: {
          pack_format: options.packFormat ?? 48,
          description: `Minecraft Localization Studio (${namespace})`,
        },
      }, null, 2)}\n`,
      isBinary: false,
    });
  }

  return result;
}
