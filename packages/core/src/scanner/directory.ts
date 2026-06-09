import type { VirtualFile, VirtualFileTree } from '../types/virtual-file.js';

const TEXT_EXTENSIONS = new Set([
  '.json',
  '.mcfunction',
  '.mcmeta',
  '.txt',
  '.snbt',
  '.lang',
]);

function isLikelyText(path: string): boolean {
  const lower = path.toLowerCase();
  for (const ext of TEXT_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '');
}

async function readFileEntry(
  file: File,
  basePath: string,
): Promise<VirtualFile> {
  const relative = basePath ? `${basePath}/${file.name}` : file.name;
  const path = normalizePath(relative);

  if (isLikelyText(path)) {
    const text = await file.text();
    return { path, content: text, isBinary: false };
  }

  const buffer = await file.arrayBuffer();
  return { path, content: new Uint8Array(buffer), isBinary: true };
}

async function walkFileList(
  files: FileList | File[],
  basePath: string,
): Promise<VirtualFileTree> {
  const result: VirtualFileTree = [];
  const fileArray = Array.from(files);

  for (const file of fileArray) {
    const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    const path = normalizePath(relative || (basePath ? `${basePath}/${file.name}` : file.name));

    if (isLikelyText(path)) {
      result.push({ path, content: await file.text(), isBinary: false });
    } else {
      const buffer = await file.arrayBuffer();
      result.push({ path, content: new Uint8Array(buffer), isBinary: true });
    }
  }

  return result;
}

/** Scan from `<input type="file" webkitdirectory>`. */
export async function scanFromFileList(files: FileList | File[]): Promise<VirtualFileTree> {
  return walkFileList(files, '');
}

/** Scan from File System Access API directory handle. */
export async function scanFromDirectoryHandle(
  handle: FileSystemDirectoryHandle,
  basePath = '',
): Promise<VirtualFileTree> {
  const result: VirtualFileTree = [];

  for await (const [name, entry] of handle as unknown as AsyncIterable<
    [string, FileSystemDirectoryHandle | FileSystemFileHandle]
  >) {
    const path = basePath ? `${basePath}/${name}` : name;

    if (entry.kind === 'directory') {
      const sub = await scanFromDirectoryHandle(entry as FileSystemDirectoryHandle, path);
      result.push(...sub);
    } else if (entry.kind === 'file') {
      const file = await entry.getFile();
      const normalized = normalizePath(path);
      if (isLikelyText(normalized)) {
        result.push({ path: normalized, content: await file.text(), isBinary: false });
      } else {
        const buffer = await file.arrayBuffer();
        result.push({ path: normalized, content: new Uint8Array(buffer), isBinary: true });
      }
    }
  }

  return result;
}

export async function pickDirectory(): Promise<VirtualFileTree | null> {
  const picker = (
    window as Window & {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;
  if (!picker) return null;
  const handle = await picker();
  return scanFromDirectoryHandle(handle);
}

export { readFileEntry, normalizePath };
