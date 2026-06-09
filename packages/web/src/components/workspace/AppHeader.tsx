import {
  Archive,
  Download,
  FolderOpen,
  FolderUp,
  Languages,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface AppHeaderProps {
  projectName: string;
  entryCount: number;
  loading: boolean;
  progress: string;
  hasProject: boolean;
  onFolderInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onZipInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPickDirectory: () => void;
  onExportWorkspace: () => void;
  onBuildZip: () => void;
  onLoadExisting: () => void;
}

export function AppHeader({
  projectName,
  entryCount,
  loading,
  progress,
  hasProject,
  onFolderInput,
  onZipInput,
  onPickDirectory,
  onExportWorkspace,
  onBuildZip,
  onLoadExisting,
}: AppHeaderProps) {
  return (
    <header className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-panel-header px-2">
      <div className="flex items-center gap-2 px-2">
        <Languages className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">MLS</span>
      </div>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <label>
        <Button variant="ghost" size="sm" asChild>
          <span>
            <FolderUp className="h-3.5 w-3.5" />
            Folder
          </span>
        </Button>
        <input
          type="file"
          className="hidden"
          multiple
          {...({ webkitdirectory: '', directory: '' } as object)}
          onChange={onFolderInput}
        />
      </label>

      <label>
        <Button variant="ghost" size="sm" asChild>
          <span>
            <Archive className="h-3.5 w-3.5" />
            ZIP
          </span>
        </Button>
        <input type="file" className="hidden" accept=".zip" onChange={onZipInput} />
      </label>

      <Button variant="ghost" size="sm" onClick={onPickDirectory}>
        <FolderOpen className="h-3.5 w-3.5" />
        Open
      </Button>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <Button variant="ghost" size="sm" disabled={!hasProject} onClick={onExportWorkspace}>
        <Download className="h-3.5 w-3.5" />
        Export
      </Button>

      <Button variant="secondary" size="sm" disabled={!hasProject} onClick={onBuildZip}>
        Build ZIP
      </Button>

      <Button variant="ghost" size="sm" onClick={onLoadExisting}>
        <RotateCcw className="h-3.5 w-3.5" />
        Restore
      </Button>

      <div className="ml-auto flex items-center gap-3 pr-2 text-[11px] text-muted-foreground">
        {loading && <span className="text-amber-400">{progress}</span>}
        {hasProject && !loading && (
          <span>
            {projectName} · {entryCount.toLocaleString()} strings
          </span>
        )}
      </div>
    </header>
  );
}
