import { useEffect, useMemo, useState } from 'react';
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
import { EntryBlacklistDialog } from './EntryBlacklistDialog';
import { ProjectExplorer } from './ProjectExplorer';
import { TranslationDetailsPanel } from './TranslationDetailsPanel';
import { TranslationEntryTable } from './TranslationEntryTable';
import { WorkspaceToolbar } from './WorkspaceToolbar';

interface TranslationWorkspaceProps {
  projectName: string;
  entries: TranslationEntry[];
  selectedId: string | null;
  onSelectEntry: (entry: TranslationEntry) => void;
  onTranslationChange: (translation: string) => void;
  onStatusChange: (status: TranslationEntry['status']) => void;
  onBatchTranslationChange: (ids: string[], translation: string) => void;
}

export function TranslationWorkspace({
  projectName,
  entries,
  selectedId,
  onSelectEntry,
  onTranslationChange,
  onStatusChange,
  onBatchTranslationChange,
}: TranslationWorkspaceProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [explorerSelection, setExplorerSelection] = useState<ExplorerSelection>({ kind: 'all' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [blacklist, setBlacklist] = useState<string[]>(loadEntryBlacklist);
  const [blacklistOpen, setBlacklistOpen] = useState(false);

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
                onBatchTranslationChange(Array.from(selectedIds), translation);
              }}
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
