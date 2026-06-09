import type { TranslationEntry } from '../types/translation-entry.js';
import type { VirtualFileTree } from '../types/virtual-file.js';
import { listFiles, getFileText } from '../types/virtual-file.js';
import { extractStrings, extractedDisplayText } from '../text-component/index.js';
import { createEntry } from './base.js';

const FUNCTION_PATTERN = /data\/[^/]+\/(function|functions)\/.+\.mcfunction$/i;

const COMMAND_PATTERNS = [
  /\btellraw\s+[^\s]+\s+/i,
  /\btitle\s+[^\s]+\s+(title|subtitle|actionbar)\s+/i,
  /\bbossbar\s+[^\s]+\s+name\s+/i,
  /\bteam\s+add\s+[^\s]+\s+/i,
];

function tryParseJsonOrSnbt(payload: string): unknown | null {
  const trimmed = payload.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* SNBT fallback: minimal quote swap for simple cases */
  }
  return null;
}

function extractCommandText(line: string): { payload: string; command: string } | null {
  for (const pattern of COMMAND_PATTERNS) {
    const match = line.match(pattern);
    if (match) {
      const payload = line.slice(match[0].length).trim();
      return { payload, command: match[0].trim().split(/\s+/)[0] ?? 'command' };
    }
  }
  return null;
}

export function extractMcFunctions(tree: VirtualFileTree, projectId: string): TranslationEntry[] {
  const entries: TranslationEntry[] = [];

  for (const file of listFiles(tree, FUNCTION_PATTERN)) {
    const text = getFileText(file);
    if (!text) continue;

    const lines = text.split(/\r?\n/);
    lines.forEach((line, lineIndex) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const cmd = extractCommandText(trimmed);
      if (!cmd) return;

      const parsed = tryParseJsonOrSnbt(cmd.payload);
      if (!parsed) {
        if (cmd.payload.length > 0) {
          entries.push(
            createEntry(projectId, {
              original: cmd.payload,
              sourceFile: file.path,
              sourceType: 'mcfunction',
              sourcePath: `line:${lineIndex + 1}`,
              context: [cmd.command],
              tags: ['mcfunction', 'raw'],
            }),
          );
        }
        return;
      }

      const extracted = extractStrings(parsed);
      for (const item of extracted) {
        entries.push(
          createEntry(projectId, {
            original: extractedDisplayText(item),
            sourceFile: file.path,
            sourceType: 'mcfunction',
            sourcePath: `line:${lineIndex + 1}${item.path}`,
            context: [cmd.command],
            references: item.translateKey ? [item.translateKey] : [],
            tags: ['mcfunction', 'text-component'],
          }),
        );
      }
    });
  }

  return entries;
}
