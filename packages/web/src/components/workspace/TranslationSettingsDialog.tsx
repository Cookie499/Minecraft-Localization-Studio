import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TranslationSettings } from '@/lib/translation-service';

interface TranslationSettingsDialogProps {
  open: boolean;
  settings: TranslationSettings;
  onClose: () => void;
  onSave: (settings: TranslationSettings) => void;
}

export function TranslationSettingsDialog({
  open,
  settings,
  onClose,
  onSave,
}: TranslationSettingsDialogProps) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (open) setDraft(settings);
  }, [open, settings]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Translation settings"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded border border-border bg-sidebar shadow-2xl">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Translation settings</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Free translation is used by default. DeepSeek settings are stored only in this browser.
          </p>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">
              Source language
              <Input
                className="mt-1 font-mono"
                value={draft.sourceLanguage}
                onChange={(event) => setDraft({
                  ...draft,
                  sourceLanguage: event.target.value,
                })}
                placeholder="en"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Target language
              <Input
                className="mt-1 font-mono"
                value={draft.targetLanguage}
                onChange={(event) => setDraft({
                  ...draft,
                  targetLanguage: event.target.value,
                })}
                placeholder="zh-CN"
              />
            </label>
          </div>

          <label className="block text-xs text-muted-foreground">
            DeepSeek API key
            <Input
              type="password"
              autoComplete="off"
              className="mt-1 font-mono"
              value={draft.deepSeekApiKey}
              onChange={(event) => setDraft({
                ...draft,
                deepSeekApiKey: event.target.value,
              })}
              placeholder="sk-..."
            />
            <span className="mt-1 block text-[10px]">
              The key is sent directly from your browser to DeepSeek and is not included in project exports.
            </span>
          </label>

          <label className="block text-xs text-muted-foreground">
            DeepSeek model
            <Select
              value={draft.deepSeekModel}
              onValueChange={(value) => setDraft({
                ...draft,
                deepSeekModel: value as TranslationSettings['deepSeekModel'],
              })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek-v4-flash">deepseek-v4-flash</SelectItem>
                <SelectItem value="deepseek-v4-pro">deepseek-v4-pro</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label className="block text-xs text-muted-foreground">
            AI translation prompt
            <textarea
              className="mt-1 min-h-[150px] w-full resize-y rounded-sm border border-input bg-input p-2.5 text-xs leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              value={draft.prompt}
              onChange={(event) => setDraft({ ...draft, prompt: event.target.value })}
            />
            <span className="mt-1 block text-[10px]">
              Variables: {'{{source}}'}, {'{{sourceLanguage}}'}, {'{{targetLanguage}}'}, {'{{sourceType}}'}, {'{{context}}'}
            </span>
          </label>

          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-medium text-foreground">Common glossary</h3>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  Matching terms are dynamically added to the AI request content.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDraft({
                  ...draft,
                  glossary: [...draft.glossary, { source: '', translation: '' }],
                })}
              >
                <Plus className="h-3.5 w-3.5" />
                Add term
              </Button>
            </div>

            <div className="space-y-1.5">
              {draft.glossary.length === 0 ? (
                <div className="rounded border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  No glossary entries.
                </div>
              ) : draft.glossary.map((entry, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
                >
                  <Input
                    value={entry.source}
                    onChange={(event) => {
                      const glossary = draft.glossary.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, source: event.target.value } : item);
                      setDraft({ ...draft, glossary });
                    }}
                    placeholder="Source term"
                  />
                  <Input
                    value={entry.translation}
                    onChange={(event) => {
                      const glossary = draft.glossary.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, translation: event.target.value } : item);
                      setDraft({ ...draft, glossary });
                    }}
                    placeholder="Suggested translation"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setDraft({
                      ...draft,
                      glossary: draft.glossary.filter((_, itemIndex) => itemIndex !== index),
                    })}
                    title="Remove glossary entry"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Save settings
          </Button>
        </div>
      </div>
    </div>
  );
}
