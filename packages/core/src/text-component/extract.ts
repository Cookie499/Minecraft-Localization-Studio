import type { ExtractedText } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractFromComponent(
  component: unknown,
  basePath: string,
  results: ExtractedText[],
): void {
  if (component === null || component === undefined) return;

  if (typeof component === 'string') {
    if (component.length > 0) {
      results.push({
        path: basePath || '/',
        text: component,
        isTranslateKey: false,
      });
    }
    return;
  }

  if (Array.isArray(component)) {
    component.forEach((item, i) => {
      extractFromComponent(item, `${basePath}/${i}`, results);
    });
    return;
  }

  if (!isRecord(component)) return;

  if (typeof component.text === 'string' && component.text.length > 0) {
    results.push({
      path: basePath ? `${basePath}/text` : '/text',
      text: component.text,
      isTranslateKey: false,
    });
  }

  if (typeof component.translate === 'string' && component.translate.length > 0) {
    results.push({
      path: basePath ? `${basePath}/translate` : '/translate',
      translateKey: component.translate,
      isTranslateKey: true,
    });
  }

  if (Array.isArray(component.with)) {
    component.with.forEach((item, i) => {
      extractFromComponent(item, `${basePath}/with/${i}`, results);
    });
  }

  if (Array.isArray(component.extra)) {
    component.extra.forEach((item, i) => {
      extractFromComponent(item, `${basePath}/extra/${i}`, results);
    });
  }
}

/** Collect all translatable strings and translate keys from a Text Component. */
export function extractStrings(component: unknown): ExtractedText[] {
  const results: ExtractedText[] = [];
  extractFromComponent(component, '', results);
  return results;
}

/** Get displayable original text for an extracted item. */
export function extractedDisplayText(item: ExtractedText): string {
  if (item.text !== undefined) return item.text;
  if (item.translateKey !== undefined) return `[${item.translateKey}]`;
  return '';
}
