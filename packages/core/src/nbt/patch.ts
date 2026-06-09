import type { TranslationEntry } from '../types/translation-entry.js';
import { applyTranslation } from '../text-component/apply.js';
import type { NbtValue } from './parse.js';

function pathSegments(path: string): string[] {
  return path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
}

function typedValue(node: unknown): { type: string; value: unknown } | null {
  if (!node || typeof node !== 'object') return null;
  const record = node as Record<string, unknown>;
  return typeof record.type === 'string' && 'value' in record
    ? record as { type: string; value: unknown }
    : null;
}

function findStringTag(root: NbtValue, path: string): {
  get: () => string;
  set: (value: string) => void;
  componentPath: string;
} | null {
  const slashIndex = path.indexOf('/');
  const nbtPath = slashIndex >= 0 ? path.slice(0, slashIndex) : path;
  const componentPath = slashIndex >= 0 ? path.slice(slashIndex) : '';
  const segments = pathSegments(nbtPath);
  let current: unknown = root;

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]!;
    const typed = typedValue(current);

    if (typed?.type === 'compound') {
      current = (typed.value as Record<string, unknown>)[segment];
      if (current === undefined) return null;
      continue;
    }

    if (typed?.type === 'list') {
      const list = typed.value as { type: string; value: unknown[] };
      const itemIndex = Number(segment);
      if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= list.value.length) {
        return null;
      }
      if (index === segments.length - 1 && list.type === 'string') {
        return {
          get: () => String(list.value[itemIndex]),
          set: (value) => {
            list.value[itemIndex] = value;
          },
          componentPath,
        };
      }
      const item = list.value[itemIndex];
      current = list.type === 'compound'
        ? item
        : { type: list.type, value: item };
      continue;
    }

    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
      if (current === undefined) return null;
      continue;
    }
    return null;
  }

  const tag = typedValue(current);
  return tag?.type === 'string' && typeof tag.value === 'string'
    ? {
        get: () => tag.value as string,
        set: (value) => {
          tag.value = value;
        },
        componentPath,
      }
    : null;
}

export function applyNbtTranslations(
  root: NbtValue,
  entries: TranslationEntry[],
  pathPrefix = '',
): number {
  let applied = 0;

  for (const entry of entries) {
    if (!entry.translation) continue;
    if (pathPrefix && !entry.sourcePath.startsWith(pathPrefix)) continue;
    const sourcePath = pathPrefix
      ? entry.sourcePath.slice(pathPrefix.length).replace(/^\./, '')
      : entry.sourcePath;
    const target = findStringTag(root, sourcePath);
    if (!target) continue;

    if (!target.componentPath) {
      target.set(entry.translation);
      applied++;
      continue;
    }

    try {
      const component = JSON.parse(target.get());
      const patched = applyTranslation(component, [{
        path: target.componentPath,
        newText: entry.translation,
      }]);
      target.set(JSON.stringify(patched));
      applied++;
    } catch {
      // The source changed after extraction; leave it untouched.
    }
  }

  return applied;
}
