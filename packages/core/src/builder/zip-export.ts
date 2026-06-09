import JSZip from 'jszip';
import type { VirtualFileTree } from '../types/virtual-file.js';

export async function exportTreeAsZip(tree: VirtualFileTree, _filename = 'localized-project.zip'): Promise<Blob> {
  const zip = new JSZip();

  for (const file of tree) {
    if (file.isBinary && file.content instanceof Uint8Array) {
      zip.file(file.path, file.content);
    } else if (typeof file.content === 'string') {
      zip.file(file.path, file.content);
    }
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
