import type { TranslationEntry } from '@mls/core';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const STATUS_OPTIONS: TranslationEntry['status'][] = [
  'untranslated',
  'translated',
  'review',
  'approved',
];

interface TranslationDetailsPanelProps {
  entry: TranslationEntry | null;
  onTranslationChange: (translation: string) => void;
  onStatusChange: (status: TranslationEntry['status']) => void;
}

export function TranslationDetailsPanel({
  entry,
  onTranslationChange,
  onStatusChange,
}: TranslationDetailsPanelProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-9 shrink-0 items-center border-b border-sidebar-border px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Details
      </div>

      {!entry ? (
        <div className="flex flex-1 items-center justify-center p-4 text-xs text-muted-foreground">
          Select an entry to view and edit translation.
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-3">
            <section>
              <div className="mb-1.5 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Source String
                </h3>
                <Badge variant={entry.status}>{entry.status}</Badge>
              </div>
              <p className="rounded-sm border border-border bg-panel p-2.5 text-sm leading-relaxed">
                {entry.original}
              </p>
            </section>

            <section>
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {entry.sourceType === 'lang' ? 'Replacement text' : 'Translation'}
              </h3>
              <textarea
                className="min-h-[120px] w-full resize-y rounded-sm border border-input bg-input p-2.5 text-sm leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={entry.translation}
                onChange={(e) => onTranslationChange(e.target.value)}
                placeholder={entry.sourceType === 'lang'
                  ? 'Enter the replacement value for this language file...'
                  : 'Enter translation...'}
              />
            </section>

            <section>
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </h3>
              <Select value={entry.status} onValueChange={(v) => onStatusChange(v as TranslationEntry['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            <Separator />

            <section className="space-y-2 text-xs">
              <DetailRow label="Translation key" value={entry.key} mono />
              <DetailRow label="Source file" value={entry.sourceFile} mono />
              <DetailRow label="Path" value={entry.sourcePath} mono />
              <DetailRow label="Type" value={entry.sourceType} />
              {entry.references.length > 0 && (
                <DetailRow label="References" value={entry.references.join(', ')} mono />
              )}
              {entry.tags.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Tags</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {entry.context.length > 0 && (
                <DetailRow label="Context" value={entry.context.join(' · ')} />
              )}
            </section>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className={`break-all ${mono ? 'font-mono text-[11px]' : ''}`}>{value}</div>
    </div>
  );
}
