import type { TranslationEntry } from '@mls/core';

export type ExplorerSelection =
  | { kind: 'all' }
  | { kind: 'type'; sourceType: string }
  | { kind: 'mca-group'; dimension: string; category?: string }
  | { kind: 'file'; sourceType: string; sourceFile: string };

export interface ExplorerNode {
  id: string;
  label: string;
  count: number;
  kind: 'root' | 'type' | 'group' | 'file';
  sourceType?: string;
  sourceFile?: string;
  dimension?: string;
  category?: string;
  children?: ExplorerNode[];
}

interface McaLocation {
  dimension: string;
  dimensionLabel: string;
  category: string;
  categoryLabel: string;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getMcaLocation(sourceFile: string): McaLocation | null {
  const path = sourceFile.replace(/\\/g, '/');
  const categoryMatch = path.match(/\/(region|entities|poi)\/[^/]+\.mca$/i);
  if (!categoryMatch) return null;

  const category = categoryMatch[1]!.toLowerCase();
  const customDimension = path.match(
    /\/dimensions\/([^/]+)\/([^/]+)\/(?:region|entities|poi)\/[^/]+\.mca$/i,
  );
  if (customDimension) {
    const dimension = `${customDimension[1]}:${customDimension[2]}`;
    return {
      dimension,
      dimensionLabel: dimension,
      category,
      categoryLabel: category === 'poi' ? 'POI' : titleCase(category),
    };
  }

  const standardDimension = path.match(
    /\/(DIM-1|DIM1)\/(?:region|entities|poi)\/[^/]+\.mca$/i,
  )?.[1]?.toUpperCase();
  const dimension = standardDimension ?? 'overworld';
  const dimensionLabel =
    dimension === 'DIM-1' ? 'Nether' :
    dimension === 'DIM1' ? 'End' :
    'Overworld';

  return {
    dimension,
    dimensionLabel,
    category,
    categoryLabel: category === 'poi' ? 'POI' : titleCase(category),
  };
}

function buildFileNodes(
  sourceType: string,
  fileMap: Map<string, number>,
): ExplorerNode[] {
  return Array.from(fileMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([sourceFile, count]) => ({
      id: `file:${sourceType}:${sourceFile}`,
      label: sourceFile.split('/').pop() ?? sourceFile,
      count,
      kind: 'file' as const,
      sourceType,
      sourceFile,
    }));
}

function buildMcaNodes(fileMap: Map<string, number>): ExplorerNode[] {
  const dimensions = new Map<string, {
    label: string;
    categories: Map<string, { label: string; files: Map<string, number> }>;
  }>();

  for (const [sourceFile, count] of fileMap) {
    const location = getMcaLocation(sourceFile);
    if (!location) continue;

    let dimension = dimensions.get(location.dimension);
    if (!dimension) {
      dimension = { label: location.dimensionLabel, categories: new Map() };
      dimensions.set(location.dimension, dimension);
    }

    let category = dimension.categories.get(location.category);
    if (!category) {
      category = { label: location.categoryLabel, files: new Map() };
      dimension.categories.set(location.category, category);
    }
    category.files.set(sourceFile, count);
  }

  return Array.from(dimensions.entries())
    .sort(([, a], [, b]) => a.label.localeCompare(b.label))
    .map(([dimensionId, dimension]) => {
      const categories = Array.from(dimension.categories.entries())
        .sort(([, a], [, b]) => a.label.localeCompare(b.label))
        .map(([categoryId, category]) => {
          const files = buildFileNodes('mca', category.files);
          return {
            id: `mca:${dimensionId}:${categoryId}`,
            label: category.label,
            count: files.reduce((sum, node) => sum + node.count, 0),
            kind: 'group' as const,
            sourceType: 'mca',
            dimension: dimensionId,
            category: categoryId,
            children: files,
          };
        });

      return {
        id: `mca:${dimensionId}`,
        label: dimension.label,
        count: categories.reduce((sum, node) => sum + node.count, 0),
        kind: 'group' as const,
        sourceType: 'mca',
        dimension: dimensionId,
        children: categories,
      };
    });
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
      const fileChildren = sourceType === 'mca'
        ? buildMcaNodes(fileMap)
        : buildFileNodes(sourceType, fileMap);

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
  if (node.kind === 'group' && node.sourceType === 'mca' && node.dimension) {
    return {
      kind: 'mca-group',
      dimension: node.dimension,
      category: node.category,
    };
  }
  return { kind: 'all' };
}

export function matchesExplorerSelection(
  entry: TranslationEntry,
  selection: ExplorerSelection,
): boolean {
  if (selection.kind === 'all') return true;
  if (selection.kind === 'type') return entry.sourceType === selection.sourceType;
  if (selection.kind === 'mca-group') {
    if (entry.sourceType !== 'mca') return false;
    const location = getMcaLocation(entry.sourceFile);
    return location?.dimension === selection.dimension &&
      (!selection.category || location.category === selection.category);
  }
  return (
    entry.sourceType === selection.sourceType && entry.sourceFile === selection.sourceFile
  );
}
