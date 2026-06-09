import type { TranslationEntry } from '../types/translation-entry.js';
import type { VirtualFileTree } from '../types/virtual-file.js';

export interface ExtractorContext {
  tree: VirtualFileTree;
  projectId: string;
}

export interface Extractor {
  readonly id: string;
  extract(context: ExtractorContext): TranslationEntry[] | Promise<TranslationEntry[]>;
}

export class ExtractorRegistry {
  private readonly extractors = new Map<string, Extractor>();

  register(extractor: Extractor): this {
    if (this.extractors.has(extractor.id)) {
      throw new Error(`Extractor already registered: ${extractor.id}`);
    }
    this.extractors.set(extractor.id, extractor);
    return this;
  }

  unregister(id: string): boolean {
    return this.extractors.delete(id);
  }

  get(id: string): Extractor | undefined {
    return this.extractors.get(id);
  }

  list(): Extractor[] {
    return Array.from(this.extractors.values());
  }
}
