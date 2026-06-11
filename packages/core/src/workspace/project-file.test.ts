import { describe, expect, it } from 'vitest';
import type { ProjectMeta, TranslationEntry } from '../types/translation-entry.js';
import {
  createCompleteProjectFile,
  parseCompleteProjectFile,
} from './project-file.js';

const project: ProjectMeta = {
  id: 'project',
  name: 'Demo',
  importedAt: '2026-01-01T00:00:00.000Z',
  fileCount: 2,
};

const entry: TranslationEntry = {
  id: 'project:entry',
  projectId: 'project',
  key: 'mls.demo',
  original: 'Hello',
  translation: '你好',
  sourceFile: 'data/demo/function/start.mcfunction',
  sourceType: 'mcfunction',
  sourcePath: 'line:1',
  context: [],
  references: [],
  tags: [],
  status: 'translated',
  aiGenerated: false,
};

describe('complete project files', () => {
  it('round-trips text and binary project files', () => {
    const encoded = createCompleteProjectFile(project, [entry], [
      {
        path: 'data/demo/function/start.mcfunction',
        content: 'say hello',
        isBinary: false,
      },
      {
        path: 'world/datapacks/demo.zip!/icon.png',
        content: Uint8Array.from([0, 1, 127, 128, 255]),
        isBinary: true,
      },
    ]);
    const decoded = parseCompleteProjectFile(JSON.parse(JSON.stringify(encoded)));

    expect(decoded.project).toEqual(project);
    expect(decoded.entries).toEqual([entry]);
    expect(decoded.tree[0]).toEqual({
      path: 'data/demo/function/start.mcfunction',
      content: 'say hello',
      isBinary: false,
    });
    expect(decoded.tree[1]?.content).toEqual(Uint8Array.from([0, 1, 127, 128, 255]));
  });

  it('rejects incomplete legacy workspace exports', () => {
    expect(() => parseCompleteProjectFile({ project, entries: [entry] }))
      .toThrow('not a supported MLS complete project file');
  });

  it('rejects duplicate paths', () => {
    const encoded = createCompleteProjectFile(project, [entry], [{
      path: 'same.txt',
      content: 'one',
      isBinary: false,
    }]);
    encoded.files.push({ ...encoded.files[0]!, content: 'two' });

    expect(() => parseCompleteProjectFile(encoded)).toThrow('Duplicate project file path');
  });
});
