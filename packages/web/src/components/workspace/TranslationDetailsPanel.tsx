import { useState } from 'react';
import type { TranslationEntry } from '@mls/core';
import {
  ArrowDownToLine,
  Check,
  Copy,
  Languages,
  Loader2,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { TranslationSettingsDialog } from './TranslationSettingsDialog';
import {
  loadTranslationSettings,
  saveTranslationSettings,
  translateWithDeepSeek,
  translateWithFreeService,
  type TranslationSettings,
} from '@/lib/translation-service';
import { visualizeControlCharacters } from '@/lib/utils';

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
  const [settings, setSettings] = useState<TranslationSettings>(
    loadTranslationSettings,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<'free' | 'ai' | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const copySource = async () => {
    if (!entry) return;
    try {
      await navigator.clipboard.writeText(entry.original);
      setCopied(true);
      setMessage('Source copied');
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setMessage('Clipboard access was denied');
    }
  };

  const runTranslation = async (provider: 'free' | 'ai') => {
    if (!entry) return;
    setBusyAction(provider);
    setMessage('');
    try {
      const translated = provider === 'free'
        ? await translateWithFreeService(entry.original, settings)
        : await translateWithDeepSeek(entry, settings);
      onTranslationChange(translated);
      setMessage(provider === 'free'
        ? 'Free translation applied'
        : 'DeepSeek translation applied');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Translation failed');
    } finally {
      setBusyAction(null);
    }
  };

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
                {visualizeControlCharacters(entry.original)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void copySource()}
                  title="Copy source text"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onTranslationChange(entry.original);
                    setMessage('Source text filled into translation');
                  }}
                  title="Fill the source text into Translation"
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  Fill source
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busyAction !== null}
                  onClick={() => void runTranslation('free')}
                  title="Translate with the free translation service"
                >
                  {busyAction === 'free'
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Languages className="h-3.5 w-3.5" />}
                  Translate
                </Button>
                <Button
                  size="sm"
                  disabled={busyAction !== null}
                  onClick={() => void runTranslation('ai')}
                  title="Translate with DeepSeek"
                >
                  {busyAction === 'ai'
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5" />}
                  AI translate
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSettingsOpen(true)}
                  title="AI translation settings"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </div>
              {message && (
                <p className="mt-1.5 text-[11px] text-muted-foreground">{message}</p>
              )}
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

      <TranslationSettingsDialog
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={(nextSettings) => {
          setSettings(nextSettings);
          saveTranslationSettings(nextSettings);
          setMessage('Translation settings saved');
        }}
      />
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
