import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { TranslationEntry } from '@mls/core';
import { Badge } from '@/components/ui/badge';
import { cn, visualizeControlCharacters } from '@/lib/utils';

const columnHelper = createColumnHelper<TranslationEntry>();

const columns = [
  columnHelper.accessor('status', {
    header: 'Status',
    size: 90,
    cell: (info) => {
      const status = info.getValue();
      return (
        <Badge variant={status} className="w-full justify-center">
          {status.slice(0, 4)}
        </Badge>
      );
    },
  }),
  columnHelper.accessor('key', {
    header: 'Translation Key',
    size: 200,
    cell: (info) => (
      <span
        className="w-full overflow-hidden whitespace-nowrap text-right font-mono text-[11px] text-muted-foreground [direction:rtl]"
        title={info.getValue()}
      >
        <span className="[direction:ltr]">{info.getValue()}</span>
      </span>
    ),
  }),
  columnHelper.accessor('original', {
    header: 'Source',
    size: 280,
    cell: (info) => <span className="line-clamp-2">{visualizeControlCharacters(info.getValue())}</span>,
  }),
  columnHelper.accessor('translation', {
    header: 'Translation',
    size: 280,
    cell: (info) => {
      const v = info.getValue();
      return (
        <span className={cn('line-clamp-2', !v && 'italic text-muted-foreground')}>
          {v || '—'}
        </span>
      );
    },
  }),
  columnHelper.accessor('sourceType', {
    header: 'Type',
    size: 90,
    cell: (info) => (
      <span className="text-[11px] text-muted-foreground">{info.getValue()}</span>
    ),
  }),
];

interface TranslationEntryTableProps {
  entries: TranslationEntry[];
  selectedId: string | null;
  selectedIds: Set<string>;
  onSelect: (entry: TranslationEntry) => void;
  onSelectionChange: (ids: Set<string>) => void;
}

export function TranslationEntryTable({
  entries,
  selectedId,
  selectedIds,
  onSelect,
  onSelectionChange,
}: TranslationEntryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const parentRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 12,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  useEffect(() => {
    if (!selectedId) return;
    const index = rows.findIndex((row) => row.original.id === selectedId);
    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: 'center' });
    }
  }, [rows, selectedId, virtualizer]);

  const gridTemplate = useMemo(
    () => `36px ${columns.map((c) => `${c.size ?? 100}px`).join(' ')}`,
    [],
  );
  const visibleIds = useMemo(() => rows.map((row) => row.original.id), [rows]);
  const allVisibleSelected = visibleIds.length > 0 &&
    visibleIds.every((id) => selectedIds.has(id));

  const toggleAllVisible = () => {
    const next = new Set(selectedIds);
    if (allVisibleSelected) {
      visibleIds.forEach((id) => next.delete(id));
    } else {
      visibleIds.forEach((id) => next.add(id));
    }
    onSelectionChange(next);
  };

  return (
    <div className="flex h-full flex-col bg-panel">
      <div
        className="grid shrink-0 border-b border-border bg-panel-header text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        <label className="flex h-8 items-center justify-center border-r border-border">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={toggleAllVisible}
            aria-label="Select all visible entries"
            className="h-3.5 w-3.5 accent-primary"
          />
        </label>
        {table.getHeaderGroups().map((hg) =>
          hg.headers.map((header) => (
            <button
              key={header.id}
              type="button"
              className="flex h-8 items-center border-r border-border px-2 text-left last:border-r-0 hover:bg-accent/40"
              onClick={header.column.getToggleSortingHandler()}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
              {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
            </button>
          )),
        )}
      </div>

      <div ref={parentRef} className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No entries match the current filters.
          </div>
        ) : (
          <div style={{ height: `${totalSize}px`, position: 'relative' }}>
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index]!;
              const entry = row.original;
              const isSelected = entry.id === selectedId;
              const isChecked = selectedIds.has(entry.id);

              return (
                <div
                  key={row.id}
                  onClick={() => onSelect(entry)}
                  className={cn(
                    'absolute left-0 grid w-full cursor-pointer border-b border-border/60 text-left text-xs hover:bg-accent/30',
                    isSelected && 'bg-accent/50',
                    isChecked && 'ring-1 ring-inset ring-primary/40',
                  )}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns: gridTemplate,
                  }}
                >
                  <label
                    className="flex items-center justify-center border-r border-border/40"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = new Set(selectedIds);
                        if (isChecked) next.delete(entry.id);
                        else next.add(entry.id);
                        onSelectionChange(next);
                      }}
                      aria-label={`Select ${entry.original}`}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                  </label>
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className="flex items-center border-r border-border/40 px-2 py-1 last:border-r-0"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex h-6 shrink-0 items-center border-t border-border bg-panel-header px-3 text-[10px] text-muted-foreground">
        {rows.length} entries · {selectedIds.size} selected
      </div>
    </div>
  );
}
