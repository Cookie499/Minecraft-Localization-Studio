import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface EntryBlacklistDialogProps {
  open: boolean;
  blacklist: string[];
  onClose: () => void;
  onSave: (blacklist: string[]) => void;
}

export function EntryBlacklistDialog({
  open,
  blacklist,
  onClose,
  onSave,
}: EntryBlacklistDialogProps) {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (open) setDraft(blacklist.join('\n'));
  }, [blacklist, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Entry blacklist"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded border border-border bg-sidebar shadow-2xl">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Hidden entry blacklist</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter one exact source text per line. Matching entries are hidden, not deleted.
          </p>
        </div>

        <div className="p-4">
          <textarea
            className="min-h-[300px] w-full resize-y rounded-sm border border-input bg-input p-2.5 font-mono text-xs leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={'Example technical text\nAnother entry to hide'}
            autoFocus
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Matching is case-sensitive and applies immediately after saving.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              onSave(draft.split(/\r?\n/));
              onClose();
            }}
          >
            Save blacklist
          </Button>
        </div>
      </div>
    </div>
  );
}
