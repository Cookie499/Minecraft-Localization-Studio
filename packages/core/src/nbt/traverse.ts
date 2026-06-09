import type { TranslationEntry } from '../types/translation-entry.js';
import { extractStrings, extractedDisplayText } from '../text-component/index.js';
import { createEntry } from '../extractors/base.js';

const NBT_STRING_FIELD_BLACKLIST = new Set([
  'id',
  'type',
  'Type',
  'Name',
  'name',
  'item_display',
  'SpawnType',
  'spawn_type',
  'Status',
  'uuid',
  'dimension',
  'biome',
  'sound',
  'particle',
  'command',
  'loot_table',
  'advancement',
  'operation',
  'billboard',
  'alignment',
  'LastOutput',
  'Tags',
  'ModId',
  'ModVersion',
  'profession',
  'Color',
  'potion',
  'color',
  'Dimension',
  'SpawnDimension'
]);

const NBT_CONTAINER_FIELD_BLACKLIST = new Set([
  'properties',
  'palette',
  'palettes',
  'block_states',
  'heightmaps',
  'structures',
  'fluid_ticks',
  'attributes',
  'WorldGenSettings',
  'Version',
  'Properties',
  'GameRules',
  'recipeBook',
  'playerdata',
  'Data',
  'pattern',
  'block_ticks',
]);

function unwrapNbtValue(node: unknown): unknown {
  if (node === null || node === undefined) return node;
  if (typeof node === 'object' && node !== null && 'type' in node && 'value' in node) {
    return unwrapNbtValue((node as { value: unknown }).value);
  }
  return node;
}

function tryParseJsonString(s: string): { parsed: true; value: unknown } | { parsed: false } {
  const t = s.trim();
  const isJsonContainer =
    (t.startsWith('{') && t.endsWith('}')) ||
    (t.startsWith('[') && t.endsWith(']'));
  const isJsonString = t.startsWith('"') && t.endsWith('"');
  if (isJsonContainer || isJsonString) {
    try {
      return { parsed: true, value: JSON.parse(t) };
    } catch {
      return { parsed: false };
    }
  }
  return { parsed: false };
}

function normalizedKey(key: string): string {
  return key
    .slice(key.lastIndexOf(':') + 1);
    // .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    // .toLowerCase();
}

/**
 * Central filter for NBT string leaves. Modify this function and the blacklist
 * constants above to fine-tune which fields become translation entries.
 */
export function shouldExtractNbtString(
  fieldName: string,
  _path: string,
  value: string,
): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.startsWith('/') && !/["']/.test(trimmed)) return false;
  return !NBT_STRING_FIELD_BLACKLIST.has(normalizedKey(fieldName));
}

function addTextEntries(
  value: unknown,
  fieldName: string,
  path: string,
  filePath: string,
  projectId: string,
  sourceType: string,
  entries: TranslationEntry[],
): void {
  const unwrapped = unwrapNbtValue(value);
  if (unwrapped === null || unwrapped === undefined) return;

  if (Array.isArray(unwrapped)) {
    unwrapped.forEach((item, index) => {
      addTextEntries(item, fieldName, `${path}[${index}]`, filePath, projectId, sourceType, entries);
    });
    return;
  }

  if (typeof unwrapped !== 'string') return;
  if (!shouldExtractNbtString(fieldName, path, unwrapped)) return;

  const json = tryParseJsonString(unwrapped);
  if (json.parsed) {
    for (const item of extractStrings(json.value)) {
      const original = extractedDisplayText(item);
      if (!original) continue;
      entries.push(
        createEntry(projectId, {
          original,
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
}

export function extractFromNbtTree(
  node: unknown,
  path: string,
  filePath: string,
  projectId: string,
  sourceType: string,
  entries: TranslationEntry[],
  fieldName = '',
): void {
  const unwrapped = unwrapNbtValue(node);

  if (unwrapped === null || unwrapped === undefined) return;
  if (typeof unwrapped === 'string') {
    addTextEntries(unwrapped, fieldName, path, filePath, projectId, sourceType, entries);
    return;
  }

  if (Array.isArray(unwrapped)) {
    unwrapped.forEach((item, i) => {
      extractFromNbtTree(
        item,
        `${path}[${i}]`,
        filePath,
        projectId,
        sourceType,
        entries,
        fieldName,
      );
    });
    return;
  }

  if (typeof unwrapped === 'object') {
    const record = unwrapped as Record<string, unknown>;
    for (const [key, child] of Object.entries(record)) {
      const childPath = path ? `${path}.${key}` : key;
      const keyName = normalizedKey(key);

      if (NBT_CONTAINER_FIELD_BLACKLIST.has(keyName)) {
        continue;
      }

      extractFromNbtTree(child, childPath, filePath, projectId, sourceType, entries, key);
    }
  }
}
