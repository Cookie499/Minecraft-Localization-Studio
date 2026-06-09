import { describe, expect, it } from 'vitest';
import { makeTranslationKey } from './id.js';

describe('makeTranslationKey', () => {
  it('is stable and human-readable for a source location', () => {
    const first = makeTranslationKey(
      'mcfunction',
      'data/adventure/functions/start.mcfunction',
      'line:1/text',
    );
    const second = makeTranslationKey(
      'mcfunction',
      'data/adventure/functions/start.mcfunction',
      'line:1/text',
    );

    expect(first).toBe(second);
    expect(first).toMatch(/^mls\.mcfunction\.adventure\.functions\.start\.line\.1\.text\./);
  });

  it('changes when the source location changes', () => {
    expect(makeTranslationKey('sign', 'world/a.nbt', 'Text1'))
      .not.toBe(makeTranslationKey('sign', 'world/a.nbt', 'Text2'));
  });
});
