import type { TranslationEntry } from '../types/translation-entry.js';
import { extractStrings, extractedDisplayText } from '../text-component/index.js';
import { createEntry } from '../extractors/base.js';

const TEXT_NBT_KEYS = new Set([
  'text',
  'Text',
  'CustomName',
  'custom_name',
  'title',
  'Title',
  'author',
  'Author',
  'filtered_title',
  'LastOutput',
  'LevelName',
  'display',
]);

const LORE_KEYS = new Set(['Lore', 'lore', 'pages', 'Pages']);

function unwrapNbtValue(node: unknown): unknown {
  if (node === null || node === undefined) return node;
  if (typeof node === 'object' && node !== null && 'type' in node && 'value' in node) {
    return unwrapNbtValue((node as { value: unknown }).value);
  }
  return node;
}

function tryParseJsonString(s: string): unknown | null {
  const t = s.trim();
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  return null;
}

export function extractFromNbtTree(
  node: unknown,
  path: string,
  filePath: string,
  projectId: string,
  sourceType: string,
  entries: TranslationEntry[],
): void {
  const unwrapped = unwrapNbtValue(node);

  if (unwrapped === null || unwrapped === undefined) return;

  if (typeof unwrapped === 'string') {
    const parsed = tryParseJsonString(unwrapped);
    if (parsed) {
      const extracted = extractStrings(parsed);
      for (const item of extracted) {
        entries.push(
          createEntry(projectId, {
            original: extractedDisplayText(item),
            sourceFile: filePath,
            sourceType,
            sourcePath: `${path}${item.path}`,
            references: item.translateKey ? [item.translateKey] : [],
            tags: [sourceType, 'nbt', 'text-component'],
          }),
        );
      }
      return;
    }
    if (unwrapped.length > 0) {
      entries.push(
        createEntry(projectId, {
          original: unwrapped,
          sourceFile: filePath,
          sourceType,
          sourcePath: path,
          tags: [sourceType, 'nbt'],
        }),
      );
    }
    return;
  }

  if (Array.isArray(unwrapped)) {
    unwrapped.forEach((item, i) => {
      extractFromNbtTree(item, `${path}[${i}]`, filePath, projectId, sourceType, entries);
    });
    return;
  }

  if (typeof unwrapped === 'object') {
    const record = unwrapped as Record<string, unknown>;
    for (const [key, child] of Object.entries(record)) {
      const childPath = path ? `${path}.${key}` : key;
      const childUnwrapped = unwrapNbtValue(child);

      if (typeof childUnwrapped === 'string' && (TEXT_NBT_KEYS.has(key) || LORE_KEYS.has(key))) {
        const parsed = tryParseJsonString(childUnwrapped);
        if (parsed) {
          const extracted = extractStrings(parsed);
          for (const item of extracted) {
            entries.push(
              createEntry(projectId, {
                original: extractedDisplayText(item),
                sourceFile: filePath,
                sourceType,
                sourcePath: `${childPath}${item.path}`,
                references: item.translateKey ? [item.translateKey] : [],
                tags: [sourceType, 'nbt', 'text-component'],
              }),
            );
          }
        } else if (childUnwrapped.length > 0) {
          entries.push(
            createEntry(projectId, {
              original: childUnwrapped,
              sourceFile: filePath,
              sourceType,
              sourcePath: childPath,
              tags: [sourceType, 'nbt'],
            }),
          );
        }
        continue;
      }

      if (key === 'components' || key === 'display') {
        extractFromNbtTree(child, childPath, filePath, projectId, sourceType, entries);
        continue;
      }

      extractFromNbtTree(child, childPath, filePath, projectId, sourceType, entries);
    }
  }
}
