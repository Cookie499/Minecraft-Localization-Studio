import type {
  CompleteProjectFile,
  ProjectMeta,
  TranslationEntry,
} from '../types/translation-entry.js';
import type { VirtualFileTree } from '../types/virtual-file.js';

const FORMAT = 'minecraft-localization-studio-project';

function encodeBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index]!;
    const b = bytes[index + 1];
    const c = bytes[index + 2];
    const value = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    output += alphabet[(value >> 18) & 63];
    output += alphabet[(value >> 12) & 63];
    output += b === undefined ? '=' : alphabet[(value >> 6) & 63];
    output += c === undefined ? '=' : alphabet[value & 63];
  }
  return output;
}

function decodeBase64(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/\s/g, '');
  if (clean.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(clean)) {
    throw new Error('Invalid Base64 file content');
  }

  const bytes: number[] = [];
  for (let index = 0; index < clean.length; index += 4) {
    const chunk = clean.slice(index, index + 4);
    const a = alphabet.indexOf(chunk[0]!);
    const b = alphabet.indexOf(chunk[1]!);
    const c = chunk[2] === '=' ? 0 : alphabet.indexOf(chunk[2]!);
    const d = chunk[3] === '=' ? 0 : alphabet.indexOf(chunk[3]!);
    if (a < 0 || b < 0 || c < 0 || d < 0) throw new Error('Invalid Base64 file content');
    const decoded = (a << 18) | (b << 12) | (c << 6) | d;
    bytes.push((decoded >> 16) & 0xff);
    if (chunk[2] !== '=') bytes.push((decoded >> 8) & 0xff);
    if (chunk[3] !== '=') bytes.push(decoded & 0xff);
  }
  return Uint8Array.from(bytes);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProjectMeta(value: unknown): value is ProjectMeta {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.importedAt === 'string' &&
    typeof value.fileCount === 'number';
}

function isTranslationEntry(value: unknown): value is TranslationEntry {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.projectId === 'string' &&
    typeof value.key === 'string' &&
    typeof value.original === 'string' &&
    typeof value.translation === 'string' &&
    typeof value.sourceFile === 'string' &&
    typeof value.sourceType === 'string' &&
    typeof value.sourcePath === 'string' &&
    Array.isArray(value.context) &&
    Array.isArray(value.references) &&
    Array.isArray(value.tags) &&
    typeof value.status === 'string' &&
    typeof value.aiGenerated === 'boolean';
}

export function createCompleteProjectFile(
  project: ProjectMeta,
  entries: TranslationEntry[],
  tree: VirtualFileTree,
): CompleteProjectFile {
  return {
    format: FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    project,
    entries,
    files: tree.map((file) => {
      if (file.isBinary) {
        if (!(file.content instanceof Uint8Array)) {
          throw new Error(`Binary file has invalid content: ${file.path}`);
        }
        return {
          path: file.path,
          isBinary: true,
          encoding: 'base64' as const,
          content: encodeBase64(file.content),
        };
      }
      if (typeof file.content !== 'string') {
        throw new Error(`Text file has invalid content: ${file.path}`);
      }
      return {
        path: file.path,
        isBinary: false,
        encoding: 'utf8' as const,
        content: file.content,
      };
    }),
  };
}

export function parseCompleteProjectFile(value: unknown): {
  project: ProjectMeta;
  entries: TranslationEntry[];
  tree: VirtualFileTree;
} {
  if (!isRecord(value) || value.format !== FORMAT || value.version !== 1) {
    throw new Error('This is not a supported MLS complete project file');
  }
  if (!isProjectMeta(value.project) || !Array.isArray(value.entries) || !Array.isArray(value.files)) {
    throw new Error('The MLS project file is incomplete');
  }
  if (!value.entries.every(isTranslationEntry)) {
    throw new Error('The MLS project contains invalid translation entries');
  }

  const paths = new Set<string>();
  const tree = value.files.map((file): VirtualFileTree[number] => {
    if (
      !isRecord(file) ||
      typeof file.path !== 'string' ||
      typeof file.isBinary !== 'boolean' ||
      typeof file.content !== 'string'
    ) {
      throw new Error('The MLS project contains an invalid file');
    }
    if (paths.has(file.path)) throw new Error(`Duplicate project file path: ${file.path}`);
    paths.add(file.path);

    if (file.isBinary && file.encoding === 'base64') {
      return { path: file.path, isBinary: true, content: decodeBase64(file.content) };
    }
    if (!file.isBinary && file.encoding === 'utf8') {
      return { path: file.path, isBinary: false, content: file.content };
    }
    throw new Error(`Invalid encoding for project file: ${file.path}`);
  });

  return {
    project: value.project,
    entries: value.entries,
    tree,
  };
}
