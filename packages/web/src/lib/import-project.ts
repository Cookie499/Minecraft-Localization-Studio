import {
  scanFromFileList,
  scanFromZipFile,
  expandNestedDataPackZips,
  pickDirectory,
  extractAllFromTree,
  extractLangPlans,
  createProjectId,
  DEFAULT_NBT_SCAN_OPTIONS,
  WorkspaceStore,
  type VirtualFileTree,
  type TranslationEntry,
  type ProjectMeta,
  type LangTranslationPlan,
  type NbtScanOptions,
} from '@mls/core';

export async function importFromDirectoryPicker(): Promise<VirtualFileTree | null> {
  const tree = await pickDirectory();
  return tree ? expandNestedDataPackZips(tree) : null;
}

export async function importFromFileList(files: FileList): Promise<VirtualFileTree> {
  const first = files[0];
  if (first?.name.endsWith('.zip')) {
    return scanFromZipFile(first);
  }
  return expandNestedDataPackZips(await scanFromFileList(files));
}

export function runExtractInWorker(
  tree: VirtualFileTree,
  projectId: string,
  nbtOptions: NbtScanOptions,
  onProgress?: (phase: string, count: number) => void,
): Promise<TranslationEntry[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/extract.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<{
      type: string;
      phase?: string;
      count?: number;
      phaseCount?: number;
      durationMs?: number;
      entries?: TranslationEntry[];
      message?: string;
    }>) => {
      const data = event.data;
      if (data.type === 'done' && data.entries) {
        worker.terminate();
        resolve(data.entries);
      } else if (data.type === 'progress' && data.phase && data.count !== undefined) {
        console.info(
          `[MLS][extract:${data.phase}] ${data.phaseCount ?? 0} entries, ` +
          `${data.durationMs ?? 0}ms, ${data.count} total`,
        );
        onProgress?.(data.phase, data.count);
      } else if (data.type === 'error') {
        worker.terminate();
        reject(new Error(data.message ?? 'Extract failed'));
      }
    };

    worker.onerror = () => {
      worker.terminate();
      reject(new Error('Worker error'));
    };

    worker.postMessage({ type: 'extract', projectId, tree, nbtOptions });
  });
}

export async function importAndExtract(
  tree: VirtualFileTree,
  projectName: string,
  onProgress?: (phase: string, count: number) => void,
  storedTree: VirtualFileTree = tree,
  langPlans: LangTranslationPlan[] = [],
  nbtOptions: NbtScanOptions = DEFAULT_NBT_SCAN_OPTIONS,
): Promise<{ projectId: string; entries: TranslationEntry[] }> {
  const projectId = createProjectId();
  const store = new WorkspaceStore();

  const meta: ProjectMeta = {
    id: projectId,
    name: projectName,
    importedAt: new Date().toISOString(),
    fileCount: storedTree.length,
  };

  const extensionCounts = tree.reduce<Record<string, number>>((counts, file) => {
    const extension = file.path.match(/(\.[^./]+)$/)?.[1]?.toLowerCase() ?? '(none)';
    counts[extension] = (counts[extension] ?? 0) + 1;
    return counts;
  }, {});
  console.info('[MLS][extract] selected tree inventory', {
    projectId,
    fileCount: tree.length,
    extensionCounts,
    mcaFiles: tree
      .filter((file) => file.path.toLowerCase().endsWith('.mca'))
      .map((file) => file.path),
  });

  let entries: TranslationEntry[];
  try {
    entries = await runExtractInWorker(tree, projectId, nbtOptions, onProgress);
  } catch (error) {
    console.warn('[MLS][extract] worker failed; retrying on main thread', error);
    entries = await extractAllFromTree(tree, projectId, (p) => {
      console.info(
        `[MLS][extract:${p.phase}] ${p.phaseCount} entries, ` +
        `${p.durationMs}ms, ${p.count} total`,
      );
      onProgress?.(p.phase, p.count);
    }, undefined, nbtOptions);
  }
  const langEntries = extractLangPlans(storedTree, projectId, langPlans);
  entries = [...langEntries, ...entries];
  if (langPlans.length > 0) {
    console.info(`[MLS][extract:lang] ${langEntries.length} entries from ${langPlans.length} plan(s)`);
    onProgress?.('lang', entries.length);
  }

  await store.saveProject(meta);
  await store.saveFileTree(projectId, storedTree);
  await store.saveEntries(entries);

  return { projectId, entries };
}
