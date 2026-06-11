import { describe, expect, it } from 'vitest';
import { visualizeControlCharacters } from './utils';

describe('visualizeControlCharacters', () => {
  it('renders line breaks and tabs as escape sequences', () => {
    expect(visualizeControlCharacters('\n\nBeyond\tthis\r\npoint'))
      .toBe('\\n\\nBeyond\\tthis\\r\\npoint');
  });
});
