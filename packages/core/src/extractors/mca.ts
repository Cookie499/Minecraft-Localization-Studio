import type { TranslationEntry } from '../types/translation-entry.js';
import type { VirtualFileTree } from '../types/virtual-file.js';
import { listFiles } from '../types/virtual-file.js';
import { extractFromMcaFile } from '../mca/parse.js';
import type { NbtScanOptions } from '../nbt/traverse.js';

const MCA_PATTERN = /(?:region|entities)\/r\.-?\d+\.-?\d+\.mca$/i;

export function findMcaFiles(tree: VirtualFileTree) {
  return listFiles(tree, MCA_PATTERN);
}

export async function extractMcaRegions(
  tree: VirtualFileTree,
  projectId: string,
  nbtOptions?: NbtScanOptions,
): Promise<TranslationEntry[]> {
  const results: TranslationEntry[] = [];
  const files = findMcaFiles(tree);

  console.info(`[MLS][mca] matched ${files.length} MCA file(s)`, files.map((file) => file.path));

  for (const file of files) {
    if (!file.isBinary || !(file.content instanceof Uint8Array)) {
      console.warn(`[MLS][mca] skipped non-binary file: ${file.path}`);
      continue;
    }
    try {
      const part = await extractFromMcaFile(file.content, file.path, projectId, nbtOptions);
      for (const entry of part) results.push(entry);
      console.info(`[MLS][mca] ${file.path}: ${part.length} translatable entries`);
    } catch (error) {
      console.error(`[MLS][mca] failed to parse ${file.path}`, error);
    }
  }

  return results;
}
