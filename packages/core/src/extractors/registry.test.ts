import { describe, expect, it } from 'vitest';
import { ExtractorRegistry } from './registry.js';

describe('ExtractorRegistry', () => {
  it('registers and runs independently defined extractors', async () => {
    const registry = new ExtractorRegistry().register({
      id: 'example',
      extract: () => [],
    });

    expect(registry.get('example')?.id).toBe('example');
    expect(await registry.get('example')?.extract({ tree: [], projectId: 'project' })).toEqual([]);
  });

  it('rejects duplicate extractor ids', () => {
    const registry = new ExtractorRegistry().register({ id: 'same', extract: () => [] });
    expect(() => registry.register({ id: 'same', extract: () => [] }))
      .toThrow('Extractor already registered');
  });
});
