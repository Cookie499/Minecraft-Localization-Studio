import type { TranslationEntry } from '@mls/core';

export type ExplorerSelection =
  | { kind: 'all' }
  | { kind: 'type'; sourceType: string }
  | { kind: 'file'; sourceType: string; sourceFile: string };

export interface ExplorerNode {
  id: string;
  label: string;
  count: number;
  kind: 'root' | 'type' | 'file';
  sourceType?: string;
  sourceFile?: string;
  children?: ExplorerNode[];
}

export function buildExplorerTree(entries: TranslationEntry[]): ExplorerNode {
  const typeMap = new Map<string, Map<string, number>>();

  for (const entry of entries) {
    let fileMap = typeMap.get(entry.sourceType);
    if (!fileMap) {
      fileMap = new Map();
      typeMap.set(entry.sourceType, fileMap);
    }
    fileMap.set(entry.sourceFile, (fileMap.get(entry.sourceFile) ?? 0) + 1);
  }

  const children: ExplorerNode[] = Array.from(typeMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sourceType, fileMap]) => {
      const fileChildren: ExplorerNode[] = Array.from(fileMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sourceFile, count]) => ({
          id: `file:${sourceType}:${sourceFile}`,
          label: sourceFile.split('/').pop() ?? sourceFile,
          count,
          kind: 'file' as const,
          sourceType,
          sourceFile,
        }));

      const typeCount = fileChildren.reduce((sum, n) => sum + n.count, 0);
      return {
        id: `type:${sourceType}`,
        label: sourceType,
        count: typeCount,
        kind: 'type' as const,
        sourceType,
        children: fileChildren,
      };
    });

  return {
    id: 'root',
    label: 'Project',
    count: entries.length,
    kind: 'root',
    children,
  };
}

export function selectionFromNode(node: ExplorerNode): ExplorerSelection {
  if (node.kind === 'file' && node.sourceType && node.sourceFile) {
    return { kind: 'file', sourceType: node.sourceType, sourceFile: node.sourceFile };
  }
  if (node.kind === 'type' && node.sourceType) {
    return { kind: 'type', sourceType: node.sourceType };
  }
  return { kind: 'all' };
}

export function matchesExplorerSelection(
  entry: TranslationEntry,
  selection: ExplorerSelection,
): boolean {
  if (selection.kind === 'all') return true;
  if (selection.kind === 'type') return entry.sourceType === selection.sourceType;
  return (
    entry.sourceType === selection.sourceType && entry.sourceFile === selection.sourceFile
  );
}
