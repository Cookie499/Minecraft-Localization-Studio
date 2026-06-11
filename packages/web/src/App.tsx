import { useCallback, useMemo, useRef, useState } from 'react';
import {
  WorkspaceStore,
  buildPatchedTree,
  discoverScanTargets,
  downloadBlob,
  downloadJson,
  exportTreeAsZip,
  filterTreeBySelection,
  filterTreeByTargets,
  type ScanDiscovery,
  type ScanSelection,
  type TranslationEntry,
  type VirtualFileTree,
  DEFAULT_NBT_SCAN_OPTIONS,
} from '@mls/core';
import { ScanSelectionPanel } from '@/components/scan/ScanSelectionPanel';
import { AppHeader } from '@/components/workspace/AppHeader';
import { TranslationWorkspace } from '@/components/workspace/TranslationWorkspace';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { importAndExtract, importFromDirectoryPicker, importFromFileList } from '@/lib/import-project';

interface PendingImport {
  name: string;
  tree: VirtualFileTree;
  discovery: ScanDiscovery;
}

export default function App() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [entries, setEntries] = useState<TranslationEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const fileTreeRef = useRef<VirtualFileTree | null>(null);

  const store = useMemo(() => new WorkspaceStore(), []);
  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId],
  );

  const persistEntry = useDebouncedCallback(async (entry: TranslationEntry) => {
    await store.saveEntry(entry);
  }, 400);

  const updateEntry = useCallback(
    (id: string, patch: Partial<TranslationEntry>) => {
      setEntries((previous) => {
        const next = previous.map((entry) => entry.id === id ? { ...entry, ...patch } : entry);
        const updated = next.find((entry) => entry.id === id);
        if (updated) void persistEntry(updated);
        return next;
      });
    },
    [persistEntry],
  );

  const updateEntries = useCallback(
    (ids: string[], patch: Partial<TranslationEntry>) => {
      const idSet = new Set(ids);
      setEntries((previous) => {
        const updated: TranslationEntry[] = [];
        const next = previous.map((entry) => {
          if (!idSet.has(entry.id)) return entry;
          const nextEntry = { ...entry, ...patch };
          updated.push(nextEntry);
          return nextEntry;
        });
        void Promise.all(updated.map((entry) => store.saveEntry(entry)));
        return next;
      });
    },
    [store],
  );

  const prepareImport = (tree: VirtualFileTree, name: string) => {
    const discovery = discoverScanTargets(tree);
    console.info('[MLS][discovery]', {
      project: name,
      fileCount: tree.length,
      targets: discovery.targets,
      unassignedFileCount: discovery.unassignedFileCount,
    });
    setPendingImport({ name, tree, discovery });
  };

  const handleImport = async (
    tree: VirtualFileTree,
    name: string,
    discovery: ScanDiscovery,
    selection: ScanSelection,
  ) => {
    const selectedTree = filterTreeBySelection(tree, discovery, selection);
    const buildTree = filterTreeByTargets(tree, discovery, selection.targetIds);
    setLoading(true);
    setProgress('Selection complete, extracting...');
    setPendingImport(null);
    fileTreeRef.current = buildTree;
    console.info('[MLS][selection]', {
      targetIds: selection.targetIds,
      langPlans: selection.langPlans,
      selectedFiles: selectedTree.map((file) => file.path),
      preservedBuildFiles: buildTree.length,
    });

    try {
      const { projectId: id, entries: extracted } = await importAndExtract(
        selectedTree,
        name,
        (phase, count) => setProgress(`${phase}: ${count}`),
        buildTree,
        selection.langPlans,
        selection.nbtOptions ?? DEFAULT_NBT_SCAN_OPTIONS,
      );
      setProjectId(id);
      setProjectName(name);
      setEntries(extracted);
      setSelectedId(extracted[0]?.id ?? null);
      setProgress(`Done: ${extracted.length} entries`);
    } finally {
      setLoading(false);
    }
  };

  const onFolderInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    const tree = await importFromFileList(files);
    const name = files[0]?.webkitRelativePath.split('/')[0] ?? 'Imported Project';
    prepareImport(tree, name);
    event.target.value = '';
  };

  const onZipInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const tree = await importFromFileList(event.target.files!);
    prepareImport(tree, file.name.replace(/\.zip$/i, ''));
    event.target.value = '';
  };

  const onPickDirectory = async () => {
    const tree = await importFromDirectoryPicker();
    if (tree) prepareImport(tree, 'Directory Project');
  };

  const onExportWorkspace = async () => {
    if (!projectId) return;
    setLoading(true);
    setProgress('Packing complete project...');
    try {
      const workspace = await store.exportCompleteProject(projectId);
      downloadJson(workspace, `${projectName || 'workspace'}.mlsproject`);
      setProgress('Project export complete');
    } finally {
      setLoading(false);
    }
  };

  const onProjectInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setLoading(true);
    setProgress('Importing complete project...');
    try {
      const raw = JSON.parse(await file.text()) as unknown;
      const imported = await store.importCompleteProject(raw);
      fileTreeRef.current = imported.tree;
      setPendingImport(null);
      setProjectId(imported.project.id);
      setProjectName(imported.project.name);
      setEntries(imported.entries);
      setSelectedId(imported.entries[0]?.id ?? null);
      setProgress(
        `Imported ${imported.entries.length} entries and ${imported.tree.length} files`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Project import failed: ${message}`);
      setProgress('Project import failed');
    } finally {
      setLoading(false);
    }
  };

  const onBuildZip = async () => {
    const tree = fileTreeRef.current;
    if (!tree) {
      alert('Import a project first');
      return;
    }
    setLoading(true);
    setProgress('Writing translations to project files...');
    try {
      const patched = await buildPatchedTree(tree, entries);
      setProgress('Creating ZIP archive...');
      const blob = await exportTreeAsZip(patched, `${projectName || 'localized'}.zip`);
      downloadBlob(blob, `${projectName || 'localized'}.zip`);
      setProgress('Build complete');
    } finally {
      setLoading(false);
    }
  };

  const onLoadExisting = async () => {
    const projects = await store.listProjects();
    if (!projects.length) {
      alert('No saved projects');
      return;
    }
    const latest = projects[0]!;
    const loaded = await store.listEntries(latest.id);
    const tree = await store.loadFileTree(latest.id);
    fileTreeRef.current = tree.length > 0 ? tree : null;
    setProjectId(latest.id);
    setProjectName(latest.name);
    setEntries(loaded);
    setSelectedId(loaded[0]?.id ?? null);
  };

  return (
    <div className="flex h-screen flex-col">
      <AppHeader
        projectName={projectName}
        entryCount={entries.length}
        loading={loading}
        progress={progress}
        hasProject={!!projectId}
        onFolderInput={(event) => void onFolderInput(event)}
        onZipInput={(event) => void onZipInput(event)}
        onPickDirectory={() => void onPickDirectory()}
        onProjectInput={(event) => void onProjectInput(event)}
        onExportWorkspace={() => void onExportWorkspace()}
        onBuildZip={() => void onBuildZip()}
        onLoadExisting={() => void onLoadExisting()}
      />

      {pendingImport ? (
        <ScanSelectionPanel
          name={pendingImport.name}
          tree={pendingImport.tree}
          discovery={pendingImport.discovery}
          onCancel={() => setPendingImport(null)}
          onConfirm={(selection) => {
            void handleImport(
              pendingImport.tree,
              pendingImport.name,
              pendingImport.discovery,
              selection,
            );
          }}
        />
      ) : (
        <TranslationWorkspace
          projectName={projectName}
          entries={entries}
          selectedId={selectedId}
          onSelectEntry={(entry) => setSelectedId(entry.id)}
          onTranslationChange={(translation) => {
            if (!selectedEntry) return;
            updateEntry(selectedEntry.id, {
              translation,
              status: translation ? 'translated' : 'untranslated',
            });
          }}
          onStatusChange={(status) => {
            if (selectedEntry) updateEntry(selectedEntry.id, { status });
          }}
          onBatchTranslationChange={(ids, translation) => {
            updateEntries(ids, {
              translation,
              status: translation ? 'translated' : 'untranslated',
            });
          }}
        />
      )}
    </div>
  );
}
