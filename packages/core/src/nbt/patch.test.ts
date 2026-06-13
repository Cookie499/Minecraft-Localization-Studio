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
      messages: {
        type: 'list',
        value: {
          type: 'string',
          value: ['"First line"', '""', '"Third line"', '""'],
        },
      },
    },
  }));
  return parseNbt(bytes);
}

describe('applyNbtTranslations', () => {
  it('replaces a complete JSON text component as one string', async () => {
    const root = await rootWithText();
    const entry = createEntry('project', {
      original: '{"text":"Root","extra":[{"text":" Extra"}]}',
      sourceFile: 'level.dat',
      sourceType: 'level.dat',
      sourcePath: 'CustomName',
    });
    entry.translation = '{"text":"Translated root","color":"gold"}';

    expect(applyNbtTranslations(root, [entry])).toBe(1);
    const customName = (root.value as Record<string, { value: string }>).CustomName!;
    expect(customName.value).toBe('{"text":"Translated root","color":"gold"}');
  });

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

  it('writes one multiline sign entry back to its original line positions', async () => {
    const root = await rootWithText();
    const entry = createEntry('project', {
      original: 'First line\nThird line',
      sourceFile: 'level.dat',
      sourceType: 'level.dat',
      sourcePath: 'messages',
      tags: [
        'level.dat',
        'nbt',
        'json-string-list',
        'json-string-list-indices:0,2',
      ],
    });
    entry.translation = '第一行\n第三行';

    expect(applyNbtTranslations(root, [entry])).toBe(1);
    const messages = (root.value as Record<string, {
      value: { value: string[] };
    }>).messages!;
    expect(messages.value.value[0]).toBe('"第一行"');
    expect(messages.value.value[1]).toBe('""');
    expect(messages.value.value[2]).toBe('"第三行"');
    expect(messages.value.value[3]).toBe('""');
  });
});
