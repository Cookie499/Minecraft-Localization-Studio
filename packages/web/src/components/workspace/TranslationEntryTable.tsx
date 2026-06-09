import { useMemo, useRef, useState } from 'react';
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
import { cn } from '@/lib/utils';

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
    cell: (info) => <span className="line-clamp-2">{info.getValue()}</span>,
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
  onSelect: (entry: TranslationEntry) => void;
}

export function TranslationEntryTable({
  entries,
  selectedId,
  onSelect,
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

  const gridTemplate = useMemo(
    () => columns.map((c) => `${c.size ?? 100}px`).join(' '),
    [],
  );

  return (
    <div className="flex h-full flex-col bg-panel">
      <div
        className="grid shrink-0 border-b border-border bg-panel-header text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
        style={{ gridTemplateColumns: gridTemplate }}
      >
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

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onSelect(entry)}
                  className={cn(
                    'absolute left-0 grid w-full border-b border-border/60 text-left text-xs hover:bg-accent/30',
                    isSelected && 'bg-accent/50',
                  )}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    gridTemplateColumns: gridTemplate,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className="flex items-center border-r border-border/40 px-2 py-1 last:border-r-0"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex h-6 shrink-0 items-center border-t border-border bg-panel-header px-3 text-[10px] text-muted-foreground">
        {rows.length} entries
      </div>
    </div>
  );
}
