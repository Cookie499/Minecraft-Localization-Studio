export interface ExtractedText {
  /** JSON pointer–style path within the component */
  path: string;
  /** Translatable plain text (from `text` field) */
  text?: string;
  /** Translation key (from `translate` field) */
  translateKey?: string;
  /** Whether this is a translation key reference rather than literal text */
  isTranslateKey: boolean;
}

export interface TextPatch {
  path: string;
  newText: string;
}
