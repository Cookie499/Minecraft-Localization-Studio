import type { TranslationEntry } from '../types/translation-entry.js';
import type { VirtualFileTree } from '../types/virtual-file.js';
import { listFiles, getFileText } from '../types/virtual-file.js';
import { extractStrings } from '../text-component/index.js';
import { createEntry } from './base.js';
import { scanItemTextComponents } from './mcfunction-item-components.js';

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
      const payloadStart = (match.index ?? 0) + match[0].length;
      const payload = line.slice(payloadStart).trim();
      return { payload, command: match[0].trim().split(/\s+/)[0] ?? 'command' };
    }
  }
  return null;
}

function joinContinuedLines(lines: string[], startIndex: number): {
  text: string;
  endIndex: number;
} {
  let text = lines[startIndex] ?? '';
  let endIndex = startIndex;

  while (/\\\s*$/.test(text) && endIndex + 1 < lines.length) {
    text = text.replace(/\\\s*$/, '') + (lines[++endIndex] ?? '').trimStart();
  }

  return { text, endIndex };
}

export function extractMcFunctions(tree: VirtualFileTree, projectId: string): TranslationEntry[] {
  const entries: TranslationEntry[] = [];

  for (const file of listFiles(tree, FUNCTION_PATTERN)) {
    const text = getFileText(file);
    if (!text) continue;

    const lines = text.split(/\r?\n/);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const logicalLine = joinContinuedLines(lines, lineIndex);
      const trimmed = logicalLine.text.trim();
      const sourcePath = logicalLine.endIndex === lineIndex
        ? `line:${lineIndex + 1}`
        : `line:${lineIndex + 1}-${logicalLine.endIndex + 1}`;
      lineIndex = logicalLine.endIndex;

      if (!trimmed || trimmed.startsWith('#')) continue;

      const itemComponents = scanItemTextComponents(trimmed);
      for (const component of itemComponents) {
        const parsed = tryParseJsonOrSnbt(component.payload);
        if (!parsed || extractStrings(parsed).length === 0) continue;
        entries.push(
          createEntry(projectId, {
            original: component.payload,
            sourceFile: file.path,
            sourceType: 'mcfunction',
            sourcePath: `${sourcePath}/${component.path}`,
            context: ['item', component.path],
            tags: ['mcfunction', 'item-component', 'text-component', 'whole-json'],
          }),
        );
      }
      if (itemComponents.length > 0) continue;

      const cmd = extractCommandText(trimmed);
      if (!cmd) continue;

      const parsed = tryParseJsonOrSnbt(cmd.payload);
      if (!parsed) {
        if (cmd.payload.length > 0) {
          entries.push(
            createEntry(projectId, {
              original: cmd.payload,
              sourceFile: file.path,
              sourceType: 'mcfunction',
              sourcePath,
              context: [cmd.command],
              tags: ['mcfunction', 'raw'],
            }),
          );
        }
        continue;
      }

      const extracted = extractStrings(parsed);
      if (extracted.length > 0) {
        entries.push(
          createEntry(projectId, {
            original: cmd.payload,
            sourceFile: file.path,
            sourceType: 'mcfunction',
            sourcePath,
            context: [cmd.command],
            references: extracted.flatMap((item) => item.translateKey ? [item.translateKey] : []),
            tags: ['mcfunction', 'text-component', 'whole-json'],
          }),
        );
      }
    }
  }

  return entries;
}
