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

async function readZipTree(
  data: Blob | ArrayBuffer | Uint8Array,
  prefix = '',
): Promise<VirtualFileTree> {
  const zip = await JSZip.loadAsync(data);
  const result: VirtualFileTree = [];

  for (const [rawPath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    const innerPath = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
    const path = prefix ? `${prefix}/${innerPath}` : innerPath;

    if (isLikelyText(path)) {
      result.push({ path, content: await zipEntry.async('string'), isBinary: false });
    } else {
      result.push({ path, content: await zipEntry.async('uint8array'), isBinary: true });
    }
  }

  return result;
}

export async function scanFromZipFile(file: File): Promise<VirtualFileTree> {
  return expandNestedDataPackZips(await readZipTree(file));
}

export async function scanFromZipBuffer(buffer: ArrayBuffer): Promise<VirtualFileTree> {
  return expandNestedDataPackZips(await readZipTree(buffer));
}

export async function expandNestedDataPackZips(
  tree: VirtualFileTree,
): Promise<VirtualFileTree> {
  const result = [...tree];

  for (const file of tree) {
    if (!file.isBinary || !(file.content instanceof Uint8Array)) continue;
    if (!/(?:^|\/)datapacks\/[^/]+\.zip$/i.test(file.path)) continue;

    try {
      const prefix = `${file.path}!`;
      const nested = await readZipTree(file.content, prefix);
      if (!nested.some((entry) => entry.path === `${prefix}/pack.mcmeta`)) continue;
      result.push(...nested);
    } catch {
      console.warn(`[MLS][scan] invalid nested data pack ZIP: ${file.path}`);
    }
  }

  return result;
}
