import { useMemo, useState } from 'react';
import type {
  LangTranslationPlan,
  ScanDiscovery,
  ScanSelection,
  ScanTarget,
  VirtualFileTree,
} from '@mls/core';
import { filterTreeBySelection } from '@mls/core';
import { Database, FolderArchive, Languages, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ScanSelectionPanelProps {
  name: string;
  tree: VirtualFileTree;
  discovery: ScanDiscovery;
  onConfirm: (selection: ScanSelection) => void;
  onCancel: () => void;
}

interface LangConfig {
  enabled: boolean;
  sourcePath: string;
  targetLocale: string;
}

const KIND_LABELS: Record<ScanTarget['kind'], string> = {
  'resource-pack': 'Resource Pack',
  'data-pack': 'Data Pack',
  save: 'Minecraft Save',
};

function dirname(path: string): string {
  return path.slice(0, path.lastIndexOf('/'));
}

function configKey(targetId: string, namespace: string): string {
  return `${targetId}:${namespace}`;
}

export function ScanSelectionPanel({
  name,
  tree,
  discovery,
  onConfirm,
  onCancel,
}: ScanSelectionPanelProps) {
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [langConfigs, setLangConfigs] = useState<Record<string, LangConfig>>({});

  const langPlans = useMemo(() => {
    const plans: LangTranslationPlan[] = [];
    for (const target of discovery.targets) {
      const namespaces = new Set(target.langFiles.map((file) => file.namespace));
      for (const namespace of namespaces) {
        const config = langConfigs[configKey(target.id, namespace)];
        const source = target.langFiles.find((file) => file.path === config?.sourcePath);
        const targetLocale = config?.targetLocale.trim().toLowerCase();
        if (!config?.enabled || !source || !targetLocale || targetLocale === source.locale) continue;
        plans.push({
          targetId: target.id,
          namespace,
          sourceLocale: source.locale,
          sourcePath: source.path,
          targetLocale,
          targetPath: `${dirname(source.path)}/${targetLocale}.json`,
        });
      }
    }
    return plans;
  }, [discovery.targets, langConfigs]);

  const selection = useMemo(
    () => ({ targetIds, langPlans }),
    [targetIds, langPlans],
  );
  const selectedFileCount = useMemo(
    () => filterTreeBySelection(tree, discovery, selection).length,
    [tree, discovery, selection],
  );

  const toggleTarget = (target: ScanTarget, checked: boolean) => {
    setTargetIds((current) =>
      checked ? [...current, target.id] : current.filter((id) => id !== target.id));
    if (!checked) {
      setLangConfigs((current) => Object.fromEntries(
        Object.entries(current).filter(([key]) => !key.startsWith(`${target.id}:`)),
      ));
    }
  };

  const updateLangConfig = (
    target: ScanTarget,
    namespace: string,
    patch: Partial<LangConfig>,
  ) => {
    const key = configKey(target.id, namespace);
    const candidates = target.langFiles.filter((file) => file.namespace === namespace);
    const defaultSource = candidates.find((file) => file.locale === 'en_us') ?? candidates[0];
    setLangConfigs((current) => {
      const previous = current[key] ?? {
        enabled: false,
        sourcePath: defaultSource?.path ?? '',
        targetLocale: 'zh_cn',
      };
      return {
        ...current,
        [key]: {
          ...previous,
          ...patch,
        },
      };
    });
  };

  return (
    <main className="min-h-0 flex-1 overflow-auto bg-panel p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Choose content to scan</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {name}: {tree.length.toLocaleString()} files found. Deep extraction starts after confirmation.
            </p>
          </div>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>

        {discovery.targets.length === 0 ? (
          <div className="rounded border border-border bg-sidebar p-6 text-sm">
            No resource pack, data pack, or save was detected.
          </div>
        ) : (
          <div className="space-y-3">
            {discovery.targets.map((target) => {
              const selected = targetIds.includes(target.id);
              const namespaces = Array.from(new Set(
                target.langFiles.map((file) => file.namespace),
              )).sort();
              return (
                <section key={target.id} className="rounded border border-border bg-sidebar">
                  <label className="flex cursor-pointer items-center gap-3 p-4">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => toggleTarget(target, event.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    {target.kind === 'save' ? (
                      <Database className="h-5 w-5 text-primary" />
                    ) : target.kind === 'resource-pack' ? (
                      <PackageOpen className="h-5 w-5 text-primary" />
                    ) : (
                      <FolderArchive className="h-5 w-5 text-primary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{target.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {KIND_LABELS[target.kind]} · {target.rootPath || '.'} · {target.fileCount.toLocaleString()} files
                      </div>
                    </div>
                  </label>

                  {namespaces.length > 0 && (
                    <div className="space-y-3 border-t border-border px-4 py-3">
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <Languages className="h-4 w-4 text-muted-foreground" />
                        Language translation plans
                      </div>
                      {namespaces.map((namespace) => {
                        const key = configKey(target.id, namespace);
                        const config = langConfigs[key];
                        const candidates = target.langFiles.filter(
                          (file) => file.namespace === namespace,
                        );
                        const defaultSource = candidates.find(
                          (file) => file.locale === 'en_us',
                        ) ?? candidates[0];
                        const sourcePath = config?.sourcePath ?? defaultSource?.path ?? '';
                        const sourceLocale = candidates.find(
                          (file) => file.path === sourcePath,
                        )?.locale;
                        const enabled = config?.enabled ?? false;
                        return (
                          <div
                            key={namespace}
                            className="grid items-center gap-2 rounded border border-border/70 p-3 md:grid-cols-[auto_1fr_1fr]"
                          >
                            <label className="flex items-center gap-2 text-xs font-medium">
                              <input
                                type="checkbox"
                                disabled={!selected}
                                checked={enabled}
                                onChange={(event) => updateLangConfig(
                                  target,
                                  namespace,
                                  { enabled: event.target.checked },
                                )}
                                className="h-3.5 w-3.5 accent-primary"
                              />
                              {namespace}
                            </label>
                            <label className="text-[10px] text-muted-foreground">
                              Source language
                              <select
                                disabled={!selected || !enabled}
                                value={sourcePath}
                                onChange={(event) => updateLangConfig(
                                  target,
                                  namespace,
                                  { sourcePath: event.target.value },
                                )}
                                className="mt-1 h-7 w-full rounded-sm border border-input bg-input px-2 font-mono text-xs text-foreground"
                              >
                                {candidates.map((file) => (
                                  <option key={file.path} value={file.path}>{file.locale}</option>
                                ))}
                              </select>
                            </label>
                            <label className="text-[10px] text-muted-foreground">
                              Target locale (existing or new)
                              <Input
                                disabled={!selected || !enabled}
                                value={config?.targetLocale ?? 'zh_cn'}
                                onChange={(event) => updateLangConfig(
                                  target,
                                  namespace,
                                  { targetLocale: event.target.value },
                                )}
                                className="mt-1 h-7 font-mono"
                                placeholder="zh_cn"
                              />
                              {enabled && sourceLocale === (config?.targetLocale ?? 'zh_cn').trim().toLowerCase() && (
                                <span className="mt-1 block text-red-400">
                                  Target locale must differ from source.
                                </span>
                              )}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between rounded border border-border bg-panel-header p-3">
          <div className="text-xs text-muted-foreground">
            {targetIds.length} target(s), {langPlans.length} language plan(s),
            {' '}{selectedFileCount.toLocaleString()} files selected for deep extraction
          </div>
          <Button
            disabled={targetIds.length === 0 || selectedFileCount === 0}
            onClick={() => onConfirm(selection)}
          >
            Start extraction
          </Button>
        </div>
      </div>
    </main>
  );
}
