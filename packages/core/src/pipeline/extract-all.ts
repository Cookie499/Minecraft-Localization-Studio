import type { TranslationEntry } from '../types/translation-entry.js';
import type { VirtualFileTree } from '../types/virtual-file.js';
import { createDefaultExtractorRegistry } from '../extractors/default-registry.js';
import type { ExtractorRegistry } from '../extractors/registry.js';
import type { NbtScanOptions } from '../nbt/traverse.js';

function dedupeEntries(entries: TranslationEntry[]): TranslationEntry[] {
  const map = new Map<string, TranslationEntry>();
  for (const entry of entries) {
    map.set(entry.id, entry);
  }
  return Array.from(map.values());
}

export interface ExtractProgress {
  phase: string;
  count: number;
  phaseCount: number;
  durationMs: number;
}

export async function extractAllFromTree(
  tree: VirtualFileTree,
  projectId: string,
  onProgress?: (p: ExtractProgress) => void,
  registry: ExtractorRegistry = createDefaultExtractorRegistry(),
  nbtOptions?: NbtScanOptions,
): Promise<TranslationEntry[]> {
  const all: TranslationEntry[] = [];

  console.info(`[MLS][extract] starting with ${tree.length} selected file(s)`);
  console.info('[MLS][extract] selected files', tree.map((file) => file.path));

  for (const extractor of registry.list()) {
    const startedAt = performance.now();
    try {
      const part = await extractor.extract({ tree, projectId, nbtOptions });
      const durationMs = Math.round(performance.now() - startedAt);
      for (const entry of part) all.push(entry);
      console.info(
        `[MLS][extract:${extractor.id}] ${part.length} entries in ${durationMs}ms`,
      );
      onProgress?.({
        phase: extractor.id,
        count: all.length,
        phaseCount: part.length,
        durationMs,
      });
    } catch (error) {
      console.error(`[MLS][extract:${extractor.id}] failed`, error);
      throw error;
    }
  }

  return dedupeEntries(all);
}
