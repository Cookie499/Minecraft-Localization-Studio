import type { VirtualFile, VirtualFileTree } from '../types/virtual-file.js';

export type ScanTargetKind = 'resource-pack' | 'data-pack' | 'save';

export interface LangFileCandidate {
  path: string;
  rootPath: string;
  namespace: string;
  locale: string;
}

export interface ScanTarget {
  id: string;
  kind: ScanTargetKind;
  rootPath: string;
  name: string;
  fileCount: number;
  langFiles: LangFileCandidate[];
}

export interface ScanDiscovery {
  targets: ScanTarget[];
  unassignedFileCount: number;
}

export interface LangTranslationPlan {
  targetId: string;
  namespace: string;
  sourceLocale: string;
  sourcePath: string;
  targetLocale: string;
  targetPath: string;
}

export interface ScanSelection {
  targetIds: string[];
  langPlans: LangTranslationPlan[];
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function dirname(path: string): string {
  const normalized = normalize(path);
  const index = normalized.lastIndexOf('/');
  return index < 0 ? '' : normalized.slice(0, index);
}

function basename(path: string): string {
  const normalized = normalize(path);
  return normalized.slice(normalized.lastIndexOf('/') + 1);
}

function isWithinRoot(path: string, rootPath: string): boolean {
  const normalizedPath = normalize(path);
  const normalizedRoot = normalize(rootPath);
  return !normalizedRoot ||
    normalizedPath === normalizedRoot ||
    normalizedPath.startsWith(`${normalizedRoot}/`);
}

function relativeToRoot(path: string, rootPath: string): string {
  const normalizedPath = normalize(path);
  const normalizedRoot = normalize(rootPath);
  return normalizedRoot ? normalizedPath.slice(normalizedRoot.length + 1) : normalizedPath;
}

function langCandidate(file: VirtualFile, rootPath: string): LangFileCandidate | null {
  const relative = relativeToRoot(file.path, rootPath);
  const match = relative.match(/^assets\/([^/]+)\/lang\/([^/]+)\.json$/i);
  if (!match) return null;
  return {
    path: file.path,
    rootPath,
    namespace: match[1]!,
    locale: match[2]!.toLowerCase(),
  };
}

function targetId(kind: ScanTargetKind, rootPath: string): string {
  return `${kind}:${normalize(rootPath) || '.'}`;
}

export function discoverScanTargets(tree: VirtualFileTree): ScanDiscovery {
  const manifests = tree.filter((file) => basename(file.path).toLowerCase() === 'pack.mcmeta');
  const levelFiles = tree.filter((file) => basename(file.path).toLowerCase() === 'level.dat');
  const targets: ScanTarget[] = [];
  const claimed = new Set<string>();

  for (const manifest of manifests) {
    const rootPath = dirname(manifest.path);
    const files = tree.filter((file) => isWithinRoot(file.path, rootPath));
    const relativePaths = files.map((file) => relativeToRoot(file.path, rootPath));
    const hasAssets = relativePaths.some((path) => path.startsWith('assets/'));
    const hasData = relativePaths.some((path) => path.startsWith('data/'));
    const kind: ScanTargetKind = hasAssets ? 'resource-pack' : 'data-pack';
    const langFiles = files
      .map((file) => langCandidate(file, rootPath))
      .filter((candidate): candidate is LangFileCandidate => candidate !== null)
      .sort((a, b) => a.path.localeCompare(b.path));

    targets.push({
      id: targetId(kind, rootPath),
      kind,
      rootPath,
      name: rootPath ? basename(rootPath) : hasAssets && hasData ? 'Combined Pack' : 'Pack Root',
      fileCount: files.length,
      langFiles,
    });
    files.forEach((file) => claimed.add(file.path));
  }

  for (const levelFile of levelFiles) {
    const rootPath = dirname(levelFile.path);
    const files = tree.filter((file) => isWithinRoot(file.path, rootPath));
    targets.push({
      id: targetId('save', rootPath),
      kind: 'save',
      rootPath,
      name: rootPath ? basename(rootPath) : 'Save Root',
      fileCount: files.length,
      langFiles: [],
    });
    files.forEach((file) => claimed.add(file.path));
  }

  targets.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  return {
    targets,
    unassignedFileCount: tree.filter((file) => !claimed.has(file.path)).length,
  };
}

export function filterTreeBySelection(
  tree: VirtualFileTree,
  discovery: ScanDiscovery,
  selection: ScanSelection,
): VirtualFileTree {
  const selectedTree = filterTreeByTargets(tree, discovery, selection.targetIds);
  const allLangPaths = new Set(discovery.targets.flatMap((target) =>
    target.langFiles.map((file) => file.path)));
  return selectedTree.filter((file) => !allLangPaths.has(file.path));
}

export function filterTreeByTargets(
  tree: VirtualFileTree,
  discovery: ScanDiscovery,
  targetIds: string[],
): VirtualFileTree {
  const selectedTargets = discovery.targets.filter((target) => targetIds.includes(target.id));
  return tree.filter((file) => selectedTargets.some((target) =>
    isWithinRoot(file.path, target.rootPath)));
}
