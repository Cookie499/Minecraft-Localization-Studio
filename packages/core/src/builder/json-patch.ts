import { gzip } from 'pako';
import { patchMcaFile } from '../mca/parse.js';
import { applyNbtTranslations } from '../nbt/patch.js';
import { parseNbt, serializeNbt } from '../nbt/parse.js';
import { applyTranslation } from '../text-component/apply.js';
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

function getAtPath(root: unknown, path: string): unknown {
  const segments = pathSegments(path);
  let current = root;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      current = current[Number(segment)];
    } else if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

function setAtPath(root: unknown, path: string, value: unknown): boolean {
  const segments = pathSegments(path);
  if (segments.length === 0) return false;
  let current = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    if (Array.isArray(current)) {
      current = current[Number(segment)];
    } else if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return false;
    }
  }
  const last = segments[segments.length - 1]!;
  if (Array.isArray(current)) {
    current[Number(last)] = value;
    return true;
  }
  if (typeof current !== 'object' || current === null) return false;
  (current as Record<string, unknown>)[last] = value;
  return true;
}

function applyJsonTranslation(root: unknown, path: string, translation: string): boolean {
  const slashIndex = path.indexOf('/');
  if (slashIndex < 0) {
    return setAtPath(root, path, translation);
  }

  const componentPath = path.slice(0, slashIndex);
  const innerPath = path.slice(slashIndex);
  const component = getAtPath(root, componentPath);
  if (component === undefined) return false;
  return setAtPath(root, componentPath, applyTranslation(component, [{
    path: innerPath,
    newText: translation,
  }]));
}

function patchJsonFiles(tree: VirtualFileTree, entries: TranslationEntry[]): VirtualFileTree {
  const byFile = new Map<string, TranslationEntry[]>();
  for (const entry of entries) {
    if (!entry.translation) continue;
    if (!['pack.mcmeta', 'advancement', 'loot_table'].includes(entry.sourceType)) continue;
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
        applyJsonTranslation(json, entry.sourcePath, entry.translation);
      }
      return { ...file, content: JSON.stringify(json, null, 2), isBinary: false };
    } catch {
      return file;
    }
  });
}

function upsertFile(tree: VirtualFileTree, file: VirtualFile): void {
  const index = tree.findIndex((candidate) => candidate.path === file.path);
  if (index >= 0) tree[index] = file;
  else tree.push(file);
}

async function applyBinaryPatches(
  tree: VirtualFileTree,
  entries: TranslationEntry[],
): Promise<VirtualFileTree> {
  const byFile = new Map<string, TranslationEntry[]>();
  for (const entry of entries) {
    if (!entry.translation) continue;
    if (!['mca', 'structure', 'level.dat', 'playerdata'].includes(entry.sourceType)) continue;
    const fileEntries = byFile.get(entry.sourceFile) ?? [];
    fileEntries.push(entry);
    byFile.set(entry.sourceFile, fileEntries);
  }

  const result = cloneTree(tree);
  for (const [path, fileEntries] of byFile) {
    const file = result.find((candidate) => candidate.path === path);
    if (!file?.isBinary || !(file.content instanceof Uint8Array)) continue;

    if (fileEntries[0]?.sourceType === 'mca') {
      const patched = await patchMcaFile(file.content, fileEntries);
      if (patched.applied > 0) file.content = patched.data;
      continue;
    }

    try {
      const wasGzip = file.content[0] === 0x1f && file.content[1] === 0x8b;
      const root = await parseNbt(file.content);
      const applied = applyNbtTranslations(root, fileEntries);
      if (applied === 0) continue;
      const encoded = await serializeNbt(root);
      file.content = wasGzip ? gzip(encoded) : encoded;
    } catch {
      console.warn(`[MLS][build] failed to patch NBT file: ${path}`);
    }
  }

  return result;
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

export async function buildPatchedTree(
  tree: VirtualFileTree,
  entries: TranslationEntry[],
  options: BuildOptions = {},
): Promise<VirtualFileTree> {
  const binaryPatched = await applyBinaryPatches(tree, entries);
  const result = patchJsonFiles(applyLangPatches(binaryPatched, entries), entries);

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
