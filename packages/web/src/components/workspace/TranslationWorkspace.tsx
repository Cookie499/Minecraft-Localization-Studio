import { useEffect, useMemo, useRef, useState } from 'react';
import type { TranslationEntry } from '@mls/core';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { filterEntries, type StatusFilter } from '@/lib/filter-entries';
import {
  isEntryBlacklisted,
  loadEntryBlacklist,
  saveEntryBlacklist,
} from '@/lib/entry-blacklist';
import type { ExplorerSelection } from '@/lib/explorer-tree';
import {
  loadTranslationSettings,
  translateWithDeepSeek,
} from '@/lib/translation-service';
import { EntryBlacklistDialog } from './EntryBlacklistDialog';
import { ProjectExplorer } from './ProjectExplorer';
import { TranslationDetailsPanel } from './TranslationDetailsPanel';
import { TranslationEntryTable } from './TranslationEntryTable';
import { WorkspaceToolbar } from './WorkspaceToolbar';

const AI_TRANSLATION_CONCURRENCY = 3;

interface TranslationWorkspaceProps {
  projectName: string;
  entries: TranslationEntry[];
  selectedId: string | null;
  onSelectEntry: (entry: TranslationEntry) => void;
  onTranslationChange: (translation: string) => void;
  onStatusChange: (status: TranslationEntry['status']) => void;
  onBatchTranslationChange: (ids: string[], translation: string) => Promise<void>;
  onAiTranslationChange: (id: string, translation: string) => Promise<void>;
}

export function TranslationWorkspace({
  projectName,
  entries,
  selectedId,
  onSelectEntry,
  onTranslationChange,
  onStatusChange,
  onBatchTranslationChange,
  onAiTranslationChange,
}: TranslationWorkspaceProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [explorerSelection, setExplorerSelection] = useState<ExplorerSelection>({ kind: 'all' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [blacklist, setBlacklist] = useState<string[]>(loadEntryBlacklist);
  const [blacklistOpen, setBlacklistOpen] = useState(false);
  const [batchAiBusy, setBatchAiBusy] = useState(false);
  const [batchAiMessage, setBatchAiMessage] = useState('');
  const batchAiControllerRef = useRef<AbortController | null>(null);

  const visibleEntries = useMemo(
    () => entries.filter((entry) => !isEntryBlacklisted(entry, blacklist)),
    [blacklist, entries],
  );

  const filteredEntries = useMemo(
    () => filterEntries(visibleEntries, {
      search,
      status: statusFilter,
      explorer: explorerSelection,
    }),
    [visibleEntries, search, statusFilter, explorerSelection],
  );

  const selectedEntry = useMemo(
    () => visibleEntries.find((e) => e.id === selectedId) ?? null,
    [visibleEntries, selectedId],
  );

  useEffect(() => {
    const entryIds = new Set(visibleEntries.map((entry) => entry.id));
    setSelectedIds((current) => {
      const next = new Set(Array.from(current).filter((id) => entryIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [visibleEntries]);

  useEffect(() => () => {
    batchAiControllerRef.current?.abort();
  }, []);

  const selectSameOriginal = () => {
    if (!selectedEntry) return;
    setSelectedIds(new Set(
      filteredEntries
        .filter((entry) => entry.original === selectedEntry.original)
        .map((entry) => entry.id),
    ));
  };

  const locateNextSelected = () => {
    const checkedEntries = visibleEntries.filter((entry) => selectedIds.has(entry.id));
    if (checkedEntries.length === 0) return;
    const currentIndex = checkedEntries.findIndex((entry) => entry.id === selectedId);
    const nextEntry = checkedEntries[(currentIndex + 1) % checkedEntries.length]!;
    setSearch('');
    setStatusFilter('all');
    setExplorerSelection({ kind: 'all' });
    onSelectEntry(nextEntry);
  };

  const aiTranslateSelected = async () => {
    if (batchAiBusy || selectedIds.size === 0) return;

    const selectedEntries = entries.filter((entry) => selectedIds.has(entry.id));
    const settings = loadTranslationSettings();
    if (!settings.deepSeekApiKey.trim()) {
      setBatchAiMessage('Configure a DeepSeek API key in AI translation settings first');
      return;
    }

    setBatchAiBusy(true);
    setBatchAiMessage(`0 / ${selectedEntries.length}`);
    const controller = new AbortController();
    batchAiControllerRef.current = controller;
    let succeeded = 0;
    const failures: string[] = [];
    let nextIndex = 0;
    let completed = 0;

    const translateNext = async () => {
      while (!controller.signal.aborted && nextIndex < selectedEntries.length) {
        const entry = selectedEntries[nextIndex]!;
        nextIndex += 1;
        try {
          const translation = await translateWithDeepSeek(entry, settings, controller.signal);
          if (controller.signal.aborted) break;
          await onAiTranslationChange(entry.id, translation);
          succeeded += 1;
        } catch (error) {
          if (controller.signal.aborted) break;
          failures.push(error instanceof Error ? error.message : 'Translation failed');
        } finally {
          completed += 1;
          setBatchAiMessage(`${completed} / ${selectedEntries.length}`);
        }
      }
    };

    await Promise.all(
      Array.from(
        { length: Math.min(AI_TRANSLATION_CONCURRENCY, selectedEntries.length) },
        () => translateNext(),
      ),
    );

    const cancelled = controller.signal.aborted;
    batchAiControllerRef.current = null;
    setBatchAiBusy(false);
    if (cancelled) {
      setBatchAiMessage(
        `Stopped after ${completed} / ${selectedEntries.length}; ${succeeded} translated`,
      );
    } else if (failures.length === 0) {
      setBatchAiMessage(`AI translated ${succeeded} selected entries`);
    } else {
      const firstError = failures[0]!;
      setBatchAiMessage(
        `AI translated ${succeeded}; ${failures.length} failed. ${firstError}`,
      );
    }
  };

  return (
    <>
      <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
        <ResizablePanel defaultSize={18} minSize={12} maxSize={30}>
          <ProjectExplorer
            entries={visibleEntries}
            projectName={projectName}
            selection={explorerSelection}
            onSelect={setExplorerSelection}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={52} minSize={35}>
          <div className="flex h-full flex-col">
            <WorkspaceToolbar
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              entries={visibleEntries}
              selectedCount={selectedIds.size}
              hiddenCount={entries.length - visibleEntries.length}
              canSelectSame={selectedEntry !== null}
              onOpenBlacklist={() => setBlacklistOpen(true)}
              onSelectSame={selectSameOriginal}
              onLocateSelected={locateNextSelected}
              onClearSelection={() => setSelectedIds(new Set())}
              onApplyBatchTranslation={(translation) => {
                void onBatchTranslationChange(Array.from(selectedIds), translation);
              }}
              onAiTranslateSelected={() => void aiTranslateSelected()}
              onStopAiTranslation={() => batchAiControllerRef.current?.abort()}
              aiTranslationBusy={batchAiBusy}
              aiTranslationMessage={batchAiMessage}
            />
            <TranslationEntryTable
              entries={filteredEntries}
              selectedId={selectedId}
              selectedIds={selectedIds}
              onSelect={onSelectEntry}
              onSelectionChange={setSelectedIds}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={30} minSize={20} maxSize={45}>
          <TranslationDetailsPanel
            entry={selectedEntry}
            onTranslationChange={onTranslationChange}
            onStatusChange={onStatusChange}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <EntryBlacklistDialog
        open={blacklistOpen}
        blacklist={blacklist}
        onClose={() => setBlacklistOpen(false)}
        onSave={(values) => setBlacklist(saveEntryBlacklist(values))}
      />
    </>
  );
}
