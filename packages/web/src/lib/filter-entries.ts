import type { TranslationEntry, TranslationStatus } from '@mls/core';
import type { ExplorerSelection } from './explorer-tree';
import { matchesExplorerSelection } from './explorer-tree';

export type StatusFilter = 'all' | TranslationStatus;

export function filterEntries(
  entries: TranslationEntry[],
  options: {
    search: string;
    status: StatusFilter;
    explorer: ExplorerSelection;
  },
): TranslationEntry[] {
  const q = options.search.trim().toLowerCase();

  return entries.filter((entry) => {
    if (!matchesExplorerSelection(entry, options.explorer)) return false;
    if (options.status !== 'all' && entry.status !== options.status) return false;

    if (!q) return true;

    return (
      entry.original.toLowerCase().includes(q) ||
      entry.translation.toLowerCase().includes(q) ||
      entry.key.toLowerCase().includes(q) ||
      entry.sourcePath.toLowerCase().includes(q) ||
      entry.sourceFile.toLowerCase().includes(q) ||
      entry.sourceType.toLowerCase().includes(q)
    );
  });
}

export function countByStatus(entries: TranslationEntry[]): Record<TranslationStatus, number> {
  return entries.reduce(
    (acc, e) => {
      acc[e.status] += 1;
      return acc;
    },
    { untranslated: 0, translated: 0, review: 0, approved: 0 },
  );
}
