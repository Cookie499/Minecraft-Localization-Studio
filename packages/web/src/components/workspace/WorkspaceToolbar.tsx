import { useState } from 'react';
import type { TranslationEntry } from '@mls/core';
import {
  Ban,
  CheckCheck,
  LocateFixed,
  Search,
  Sparkles,
  Square,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { countByStatus, type StatusFilter } from '@/lib/filter-entries';

interface WorkspaceToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  entries: TranslationEntry[];
  selectedCount: number;
  hiddenCount: number;
  canSelectSame: boolean;
  onOpenBlacklist: () => void;
  onSelectSame: () => void;
  onLocateSelected: () => void;
  onClearSelection: () => void;
  onApplyBatchTranslation: (translation: string) => void;
  onAiTranslateSelected: () => void;
  onStopAiTranslation: () => void;
  aiTranslationBusy: boolean;
  aiTranslationMessage: string;
}

export function WorkspaceToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  entries,
  selectedCount,
  hiddenCount,
  canSelectSame,
  onOpenBlacklist,
  onSelectSame,
  onLocateSelected,
  onClearSelection,
  onApplyBatchTranslation,
  onAiTranslateSelected,
  onStopAiTranslation,
  aiTranslationBusy,
  aiTranslationMessage,
}: WorkspaceToolbarProps) {
  const counts = countByStatus(entries);
  const [batchTranslation, setBatchTranslation] = useState('');

  const applyBatchTranslation = () => {
    if (selectedCount === 0 || !batchTranslation) return;
    onApplyBatchTranslation(batchTranslation);
  };

  return (
    <div className="shrink-0 border-b border-border bg-panel-header px-3 py-1">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1 max-w-md">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-7 pl-7"
            placeholder="Search source, translation, path..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}>
          <SelectTrigger className="h-7 w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="untranslated">Untranslated ({counts.untranslated})</SelectItem>
            <SelectItem value="translated">Translated ({counts.translated})</SelectItem>
            <SelectItem value="review">Review ({counts.review})</SelectItem>
            <SelectItem value="approved">Approved ({counts.approved})</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenBlacklist}
          title="Configure exact source texts to hide"
        >
          <Ban className="h-3.5 w-3.5" />
          Blacklist{hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ''}
        </Button>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="w-20 shrink-0 text-[11px] text-muted-foreground">
          {selectedCount} selected
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!canSelectSame}
          onClick={onSelectSame}
          title="Select visible entries with the same source text as the active row"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Select same
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={selectedCount === 0}
          onClick={onLocateSelected}
          title="Locate the next checked entry"
        >
          <LocateFixed className="h-3.5 w-3.5" />
          Locate
        </Button>
        <Input
          value={batchTranslation}
          onChange={(event) => setBatchTranslation(event.target.value)}
          placeholder="Translation for selected entries..."
          disabled={selectedCount === 0}
          className="min-w-0 flex-1"
          onKeyDown={(event) => {
            if (event.key === 'Enter') applyBatchTranslation();
          }}
        />
        <Button
          size="sm"
          disabled={selectedCount === 0 || !batchTranslation}
          onClick={applyBatchTranslation}
        >
          Apply to {selectedCount}
        </Button>
        <Button
          size="sm"
          variant={aiTranslationBusy ? 'secondary' : 'default'}
          disabled={!aiTranslationBusy && selectedCount === 0}
          onClick={aiTranslationBusy ? onStopAiTranslation : onAiTranslateSelected}
          title={aiTranslationBusy
            ? 'Stop batch AI translation'
            : 'Translate every selected entry with DeepSeek'}
        >
          {aiTranslationBusy
            ? <Square className="h-3.5 w-3.5" />
            : <Sparkles className="h-3.5 w-3.5" />}
          {aiTranslationBusy ? `Stop (${aiTranslationMessage})` : `AI translate ${selectedCount}`}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={selectedCount === 0}
          onClick={onClearSelection}
          title="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {!aiTranslationBusy && aiTranslationMessage && (
        <p className="mt-1 text-[11px] text-muted-foreground">{aiTranslationMessage}</p>
      )}
    </div>
  );
}
