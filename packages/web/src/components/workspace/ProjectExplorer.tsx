import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileJson,
  Folder,
  FolderOpen,
  Languages,
} from 'lucide-react';
import type { TranslationEntry } from '@mls/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  buildExplorerTree,
  selectionFromNode,
  type ExplorerNode,
  type ExplorerSelection,
} from '@/lib/explorer-tree';

interface ProjectExplorerProps {
  entries: TranslationEntry[];
  projectName: string;
  selection: ExplorerSelection;
  onSelect: (selection: ExplorerSelection) => void;
}

function typeIcon(kind: ExplorerNode['kind']) {
  if (kind === 'root') return Languages;
  if (kind === 'type') return Folder;
  return FileJson;
}

function TreeNode({
  node,
  depth,
  selection,
  onSelect,
  defaultOpen,
}: {
  node: ExplorerNode;
  depth: number;
  selection: ExplorerSelection;
  onSelect: (s: ExplorerSelection) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? depth < 1);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const Icon = typeIcon(node.kind);
  const nodeSelection = selectionFromNode(node);

  const isActive =
    (selection.kind === 'all' && node.kind === 'root') ||
    (selection.kind === 'type' &&
      node.kind === 'type' &&
      selection.sourceType === node.sourceType) ||
    (selection.kind === 'file' &&
      node.kind === 'file' &&
      selection.sourceType === node.sourceType &&
      selection.sourceFile === node.sourceFile);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (hasChildren) setOpen((v) => !v);
          onSelect(nodeSelection);
        }}
        className={cn(
          'flex w-full items-center gap-1 py-0.5 pr-2 text-left text-xs hover:bg-sidebar-accent/60',
          isActive && 'bg-sidebar-accent text-accent-foreground',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        title={node.kind === 'file' ? node.sourceFile : node.label}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {node.kind === 'type' && open ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/80" />
        ) : (
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate">{node.label}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">{node.count}</span>
      </button>

      {hasChildren && open && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selection={selection}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProjectExplorer({
  entries,
  projectName,
  selection,
  onSelect,
}: ProjectExplorerProps) {
  const tree = buildExplorerTree(entries);

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-9 shrink-0 items-center border-b border-sidebar-border px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Explorer
      </div>
      <div className="border-b border-sidebar-border px-3 py-2">
        <div className="truncate text-xs font-medium text-foreground" title={projectName}>
          {projectName || 'No project'}
        </div>
        <div className="text-[10px] text-muted-foreground">{entries.length} strings</div>
      </div>
      <ScrollArea className="flex-1">
        <div className="py-1">
          {entries.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">Import a project to browse files.</p>
          ) : (
            <TreeNode
              node={tree}
              depth={0}
              selection={selection}
              onSelect={onSelect}
              defaultOpen
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
