import JSZip from 'jszip';
import type { VirtualFile, VirtualFileTree } from '../types/virtual-file.js';

function nestedArchivePath(path: string): { archivePath: string; innerPath: string } | null {
  const match = path.match(/^(.*\.zip)!\/(.+)$/i);
  return match ? { archivePath: match[1]!, innerPath: match[2]! } : null;
}

function addFile(zip: JSZip, path: string, file: VirtualFile): void {
  if (file.isBinary && file.content instanceof Uint8Array) {
    zip.file(path, file.content);
  } else if (typeof file.content === 'string') {
    zip.file(path, file.content);
  }
}

export async function exportTreeAsZip(
  tree: VirtualFileTree,
  _filename = 'localized-project.zip',
): Promise<Blob> {
  const zip = new JSZip();
  const nestedArchives = new Map<string, Array<{ innerPath: string; file: VirtualFile }>>();

  for (const file of tree) {
    const nested = nestedArchivePath(file.path);
    if (!nested) continue;
    const files = nestedArchives.get(nested.archivePath) ?? [];
    files.push({ innerPath: nested.innerPath, file });
    nestedArchives.set(nested.archivePath, files);
  }

  for (const file of tree) {
    if (nestedArchivePath(file.path)) continue;
    if (nestedArchives.has(file.path)) continue;
    addFile(zip, file.path, file);
  }

  for (const [archivePath, files] of nestedArchives) {
    const nestedZip = new JSZip();
    for (const { innerPath, file } of files) {
      addFile(nestedZip, innerPath, file);
    }
    const archive = await nestedZip.generateAsync({ type: 'uint8array' });
    zip.file(archivePath, archive);
  }

  return zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, filename);
}
