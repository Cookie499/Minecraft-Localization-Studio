import { describe, it, expect } from 'vitest';
import { extractStrings, extractedDisplayText } from './extract.js';

describe('extractStrings', () => {
  it('extracts plain text', () => {
    const result = extractStrings({ text: 'Hello' });
    expect(result).toHaveLength(1);
    expect(result[0]?.text).toBe('Hello');
    expect(result[0]?.isTranslateKey).toBe(false);
  });

  it('extracts translate key', () => {
    const result = extractStrings({ translate: 'item.minecraft.diamond' });
    expect(result).toHaveLength(1);
    expect(result[0]?.translateKey).toBe('item.minecraft.diamond');
    expect(result[0]?.isTranslateKey).toBe(true);
    expect(extractedDisplayText(result[0]!)).toBe('[item.minecraft.diamond]');
  });

  it('extracts extra array', () => {
    const result = extractStrings({
      text: 'Hello',
      extra: [{ text: ' World' }],
    });
    expect(result.length).toBeGreaterThanOrEqual(2);
    const texts = result.map((r) => r.text).filter(Boolean);
    expect(texts).toContain('Hello');
    expect(texts).toContain(' World');
  });

  it('preserves leading newlines in string components', () => {
    const result = extractStrings({
      text: '',
      extra: [
        { text: 'Divided' },
        { text: ' Guidance' },
        '\n\nBeyond this point',
      ],
    });

    expect(result[2]?.text).toBe('\n\nBeyond this point');
  });

  it('extracts array root component', () => {
    const result = extractStrings([{ text: 'Hello' }]);
    expect(result).toHaveLength(1);
    expect(result[0]?.text).toBe('Hello');
  });

  it('extracts with parameters', () => {
    const result = extractStrings({
      translate: 'chat.type.text',
      with: [{ text: 'Player' }],
    });
    expect(result.some((r) => r.translateKey === 'chat.type.text')).toBe(true);
    expect(result.some((r) => r.text === 'Player')).toBe(true);
  });
});
