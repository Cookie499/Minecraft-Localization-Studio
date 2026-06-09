import { useMemo, useState } from 'react';
import type { TranslationEntry } from '@mls/core';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { filterEntries, type StatusFilter } from '@/lib/filter-entries';
import type { ExplorerSelection } from '@/lib/explorer-tree';
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
}

export function TranslationWorkspace({
  projectName,
  entries,
  selectedId,
  onSelectEntry,
  onTranslationChange,
  onStatusChange,
}: TranslationWorkspaceProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [explorerSelection, setExplorerSelection] = useState<ExplorerSelection>({ kind: 'all' });

  const filteredEntries = useMemo(
    () => filterEntries(entries, { search, status: statusFilter, explorer: explorerSelection }),
    [entries, search, statusFilter, explorerSelection],
  );

  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId],
  );

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
      <ResizablePanel defaultSize={18} minSize={12} maxSize={30}>
        <ProjectExplorer
          entries={entries}
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
            entries={entries}
          />
          <TranslationEntryTable
            entries={filteredEntries}
            selectedId={selectedId}
            onSelect={onSelectEntry}
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
  );
}
