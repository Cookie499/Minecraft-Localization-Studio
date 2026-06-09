import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StatusFilter } from '@/lib/filter-entries';
import { countByStatus } from '@/lib/filter-entries';
import type { TranslationEntry } from '@mls/core';

interface WorkspaceToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  entries: TranslationEntry[];
}

export function WorkspaceToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  entries,
}: WorkspaceToolbarProps) {
  const counts = countByStatus(entries);

  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-panel-header px-3">
      <div className="relative min-w-0 flex-1 max-w-md">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-7 pl-7"
          placeholder="Search source, translation, path…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as StatusFilter)}>
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
    </div>
  );
}
