import nbt from 'prismarine-nbt';
import { describe, expect, it } from 'vitest';
import { createEntry } from '../extractors/base.js';
import { applyNbtTranslations } from './patch.js';
import { parseNbt } from './parse.js';

async function rootWithText() {
  const bytes = new Uint8Array(nbt.writeUncompressed({
    type: 'compound',
    name: '',
    value: {
      CustomName: {
        type: 'string',
        value: '{"text":"Root","extra":[{"text":" Extra"}]}',
      },
      pages: {
        type: 'list',
        value: {
          type: 'string',
          value: ['{"text":"Page"}'],
        },
      },
    },
  }));
  return parseNbt(bytes);
}

describe('applyNbtTranslations', () => {
  it('patches one text-component part without changing its siblings', async () => {
    const root = await rootWithText();
    const entry = createEntry('project', {
      original: ' Extra',
      sourceFile: 'level.dat',
      sourceType: 'level.dat',
      sourcePath: 'CustomName/extra/0/text',
    });
    entry.translation = ' Translated';

    expect(applyNbtTranslations(root, [entry])).toBe(1);
    const customName = (root.value as Record<string, { value: string }>).CustomName!;
    expect(JSON.parse(customName.value)).toEqual({
      text: 'Root',
      extra: [{ text: ' Translated' }],
    });
  });

  it('patches string-list elements', async () => {
    const root = await rootWithText();
    const entry = createEntry('project', {
      original: 'Page',
      sourceFile: 'level.dat',
      sourceType: 'level.dat',
      sourcePath: 'pages[0]/text',
    });
    entry.translation = 'Translated page';

    expect(applyNbtTranslations(root, [entry])).toBe(1);
    const pages = (root.value as Record<string, {
      value: { value: string[] };
    }>).pages!;
    expect(JSON.parse(pages.value.value[0]!)).toEqual({ text: 'Translated page' });
  });
});
