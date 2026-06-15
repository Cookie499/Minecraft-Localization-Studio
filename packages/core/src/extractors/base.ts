import type { TranslationEntry } from '../types/translation-entry.js';
import { makeEntryId, makeTranslationKey } from '../utils/id.js';

export function createEntry(
  projectId: string,
  params: Omit<TranslationEntry, 'id' | 'projectId' | 'key' | 'translation' | 'status' | 'aiGenerated' | 'context' | 'references' | 'tags'> & {
    key?: string;
    context?: string[];
    references?: string[];
    tags?: string[];
  },
): TranslationEntry {
  return {
    id: makeEntryId(projectId, params.sourceFile, params.sourcePath),
    projectId,
    key: params.key ?? makeTranslationKey(params.sourceType, params.sourceFile, params.sourcePath),
    original: params.original,
    translation: '',
    sourceFile: params.sourceFile,
    sourceType: params.sourceType,
    sourcePath: params.sourcePath,
    context: params.context ?? [],
    references: params.references ?? [],
    tags: params.tags ?? [],
    status: 'untranslated',
    aiGenerated: false,
    position: params.position,
  };
}
