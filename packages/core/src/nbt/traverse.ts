import type {
  EntryPosition,
  TranslationEntry,
} from '../types/translation-entry.js';
import { extractStrings } from '../text-component/index.js';
import { createEntry } from '../extractors/base.js';

export const DEFAULT_NBT_STRING_FIELD_BLACKLIST = [
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
  'SpawnDimension',
  'variant',
  'Casing',
  'Lock',
  'Modifier',
  'Dye',
  'sherds',
  'StorageType',
  'BogeyStyle',
] as const;

export const DEFAULT_NBT_CONTAINER_FIELD_BLACKLIST = [
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
  'can_place_on',
  'can_break',
] as const;

export interface NbtScanOptions {
  stringFieldBlacklist: readonly string[];
  containerFieldBlacklist: readonly string[];
}

export const DEFAULT_NBT_SCAN_OPTIONS: NbtScanOptions = {
  stringFieldBlacklist: DEFAULT_NBT_STRING_FIELD_BLACKLIST,
  containerFieldBlacklist: DEFAULT_NBT_CONTAINER_FIELD_BLACKLIST,
};

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

function asCoordinate(value: unknown): number | null {
  const unwrapped = unwrapNbtValue(value);
  return typeof unwrapped === 'number' && Number.isFinite(unwrapped)
    ? unwrapped
    : null;
}

function positionFromList(
  value: unknown,
  source: EntryPosition['source'],
): EntryPosition | null {
  const unwrapped = unwrapNbtValue(value);
  if (!Array.isArray(unwrapped) || unwrapped.length < 3) return null;

  const x = asCoordinate(unwrapped[0]);
  const y = asCoordinate(unwrapped[1]);
  const z = asCoordinate(unwrapped[2]);
  return x === null || y === null || z === null
    ? null
    : { x, y, z, source };
}

function findPosition(record: Record<string, unknown>): EntryPosition | null {
  for (const key of ['Pos', 'pos', 'position'] as const) {
    if (key in record) {
      const position = positionFromList(record[key], key);
      if (position) return position;
    }
  }

  const x = asCoordinate(record.x);
  const y = asCoordinate(record.y);
  const z = asCoordinate(record.z);
  return x === null || y === null || z === null
    ? null
    : { x, y, z, source: 'x y z' };
}

/**
 * Central filter for NBT string leaves. Modify this function and the blacklist
 * constants above to fine-tune which fields become translation entries.
 */
export function shouldExtractNbtString(
  fieldName: string,
  _path: string,
  value: string,
  options: NbtScanOptions = DEFAULT_NBT_SCAN_OPTIONS,
): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.startsWith('/') && !/["']/.test(trimmed)) return false;
  return !options.stringFieldBlacklist.includes(normalizedKey(fieldName));
}

function addTextEntries(
  value: unknown,
  fieldName: string,
  path: string,
  filePath: string,
  projectId: string,
  sourceType: string,
  entries: TranslationEntry[],
  options: NbtScanOptions,
  position?: EntryPosition,
): void {
  const unwrapped = unwrapNbtValue(value);
  if (unwrapped === null || unwrapped === undefined) return;

  if (Array.isArray(unwrapped)) {
    if (normalizedKey(fieldName) === 'messages') {
      const decoded = unwrapped.map((item) => {
        if (typeof item !== 'string') return null;
        const json = tryParseJsonString(item);
        return json.parsed ? json.value : null;
      });
      if (decoded.every((item) => item !== null)) {
        const extracted = extractStrings(decoded);
        if (extracted.length > 0) {
          entries.push(
            createEntry(projectId, {
              original: JSON.stringify(decoded),
              sourceFile: filePath,
              sourceType,
              sourcePath: path,
              context: [`sign messages: ${decoded.length} line(s)`],
              references: extracted.flatMap((item) =>
                item.translateKey ? [item.translateKey] : []),
              tags: [
                sourceType,
                'nbt',
                'sign-message-array',
                'text-component',
                'whole-json',
              ],
              position,
            }),
          );
        }
        return;
      }
    }

    unwrapped.forEach((item, index) => {
      addTextEntries(
        item,
        fieldName,
        `${path}[${index}]`,
        filePath,
        projectId,
        sourceType,
        entries,
        options,
        position,
      );
    });
    return;
  }

  if (typeof unwrapped !== 'string') return;
  if (!shouldExtractNbtString(fieldName, path, unwrapped, options)) return;

  const json = tryParseJsonString(unwrapped);
  if (json.parsed) {
    if (typeof json.value === 'string') {
      if (!shouldExtractNbtString(fieldName, path, json.value, options)) return;
      entries.push(
        createEntry(projectId, {
          original: json.value,
          sourceFile: filePath,
          sourceType,
          sourcePath: path,
          tags: [sourceType, 'nbt', 'json-string'],
          position,
        }),
      );
      return;
    }

    const extracted = extractStrings(json.value);
    if (extracted.length === 0) return;

    entries.push(
      createEntry(projectId, {
        original: unwrapped,
        sourceFile: filePath,
        sourceType,
        sourcePath: path,
        references: extracted.flatMap((item) => item.translateKey ? [item.translateKey] : []),
        tags: [sourceType, 'nbt', 'text-component', 'whole-json'],
        position,
      }),
    );
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
        position,
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
  options: NbtScanOptions = DEFAULT_NBT_SCAN_OPTIONS,
  position?: EntryPosition,
): void {
  const unwrapped = unwrapNbtValue(node);

  if (unwrapped === null || unwrapped === undefined) return;
  if (typeof unwrapped === 'string') {
    addTextEntries(
      unwrapped,
      fieldName,
      path,
      filePath,
      projectId,
      sourceType,
      entries,
      options,
      position,
    );
    return;
  }

  if (Array.isArray(unwrapped)) {
    if (normalizedKey(fieldName) === 'messages') {
      addTextEntries(
        unwrapped,
        fieldName,
        path,
        filePath,
        projectId,
        sourceType,
        entries,
        options,
        position,
      );
      return;
    }

    unwrapped.forEach((item, i) => {
      extractFromNbtTree(
        item,
        `${path}[${i}]`,
        filePath,
        projectId,
        sourceType,
        entries,
        fieldName,
        options,
        position,
      );
    });
    return;
  }

  if (typeof unwrapped === 'object') {
    const record = unwrapped as Record<string, unknown>;
    const currentPosition = findPosition(record) ?? position;
    for (const [key, child] of Object.entries(record)) {
      const childPath = path ? `${path}.${key}` : key;
      const keyName = normalizedKey(key);

      if (options.containerFieldBlacklist.includes(keyName)) {
        continue;
      }

      extractFromNbtTree(
        child,
        childPath,
        filePath,
        projectId,
        sourceType,
        entries,
        key,
        options,
        currentPosition,
      );
    }
  }
}
