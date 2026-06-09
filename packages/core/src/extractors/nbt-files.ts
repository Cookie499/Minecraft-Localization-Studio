import type { TranslationEntry } from '../types/translation-entry.js';
import type { VirtualFile, VirtualFileTree } from '../types/virtual-file.js';
import { listFiles } from '../types/virtual-file.js';
import { parseNbt } from '../nbt/parse.js';
import { extractFromNbtTree } from '../nbt/traverse.js';

const STRUCTURE_PATTERN = /\.nbt$/i;
const PLAYERDATA_PATTERN = /playerdata\/[^/]+\.dat$/i;

async function extractFromBinaryFile(
  file: VirtualFile,
  projectId: string,
  sourceType: string,
): Promise<TranslationEntry[]> {
  if (!file.isBinary || !(file.content instanceof Uint8Array)) return [];

  const entries: TranslationEntry[] = [];
  try {
    const root = await parseNbt(file.content);
    extractFromNbtTree(root, '', file.path, projectId, sourceType, entries);
  } catch {
    /* skip invalid nbt */
  }
  return entries;
}

export async function extractStructureNbt(
  tree: VirtualFileTree,
  projectId: string,
): Promise<TranslationEntry[]> {
  const results: TranslationEntry[] = [];
  const files = listFiles(tree, STRUCTURE_PATTERN).filter(
    (f) => !f.path.includes('region/') && !f.path.includes('playerdata/'),
  );

  for (const file of files) {
    const part = await extractFromBinaryFile(file, projectId, 'structure');
    results.push(...part);
  }
  return results;
}

export async function extractLevelDat(
  tree: VirtualFileTree,
  projectId: string,
): Promise<TranslationEntry[]> {
  const results: TranslationEntry[] = [];
  const files = listFiles(tree, /level\.dat$/i);

  for (const file of files) {
    const part = await extractFromBinaryFile(file, projectId, 'level.dat');
    results.push(...part);
  }
  return results;
}

export async function extractPlayerData(
  tree: VirtualFileTree,
  projectId: string,
): Promise<TranslationEntry[]> {
  const results: TranslationEntry[] = [];
  const files = listFiles(tree, PLAYERDATA_PATTERN);

  for (const file of files) {
    const part = await extractFromBinaryFile(file, projectId, 'playerdata');
    results.push(...part);
  }
  return results;
}

export async function extractAllNbtFiles(
  tree: VirtualFileTree,
  projectId: string,
): Promise<TranslationEntry[]> {
  const [structures, level, players] = await Promise.all([
    extractStructureNbt(tree, projectId),
    extractLevelDat(tree, projectId),
    extractPlayerData(tree, projectId),
  ]);
  return [...structures, ...level, ...players];
}
