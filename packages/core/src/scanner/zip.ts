import JSZip from 'jszip';
import type { VirtualFileTree } from '../types/virtual-file.js';

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

export async function scanFromZipFile(file: File): Promise<VirtualFileTree> {
  const zip = await JSZip.loadAsync(file);
  const result: VirtualFileTree = [];

  const entries = Object.entries(zip.files);
  for (const [rawPath, zipEntry] of entries) {
    if (zipEntry.dir) continue;

    const path = rawPath.replace(/\\/g, '/');

    if (isLikelyText(path)) {
      const text = await zipEntry.async('string');
      result.push({ path, content: text, isBinary: false });
    } else {
      const data = await zipEntry.async('uint8array');
      result.push({ path, content: data, isBinary: true });
    }
  }

  return result;
}

export async function scanFromZipBuffer(buffer: ArrayBuffer): Promise<VirtualFileTree> {
  const zip = await JSZip.loadAsync(buffer);
  const result: VirtualFileTree = [];

  for (const [rawPath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const path = rawPath.replace(/\\/g, '/');

    if (isLikelyText(path)) {
      result.push({ path, content: await zipEntry.async('string'), isBinary: false });
    } else {
      result.push({ path, content: await zipEntry.async('uint8array'), isBinary: true });
    }
  }

  return result;
}
