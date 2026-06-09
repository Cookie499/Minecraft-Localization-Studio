import { inflate, ungzip } from 'pako';
import { parseNbt } from '../nbt/parse.js';
import { extractFromNbtTree } from '../nbt/traverse.js';
import type { TranslationEntry } from '../types/translation-entry.js';

const SECTOR_BYTES = 4096;

interface ChunkLocation {
  sectorOffset: number;
  sectorCount: number;
}

function readInt32BE(view: DataView, offset: number): number {
  return view.getInt32(offset, false);
}

function parseChunkLocations(data: Uint8Array): ChunkLocation[] {
  const locations: ChunkLocation[] = [];
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  for (let i = 0; i < 1024; i++) {
    const entry = readInt32BE(view, i * 4);
    const sectorOffset = (entry >> 8) & 0xffffff;
    const sectorCount = entry & 0xff;
    if (sectorOffset > 0 && sectorCount > 0) {
      locations.push({ sectorOffset, sectorCount });
    }
  }
  return locations;
}

function extractChunkNbt(sectorData: Uint8Array): Uint8Array | null {
  if (sectorData.length < 5) return null;

  const view = new DataView(sectorData.buffer, sectorData.byteOffset, sectorData.byteLength);
  const length = view.getInt32(0, false);
  if (length <= 1 || length + 4 > sectorData.length) return null;

  const compression = sectorData[4];
  const compressed = sectorData.subarray(5, 4 + length);

  try {
    if (compression === 2) {
      return inflate(compressed);
    }
    if (compression === 1) {
      return ungzip(compressed);
    }
    if (compression === 3) {
      return compressed;
    }
  } catch {
    return null;
  }
  return null;
}

export async function extractFromMcaFile(
  data: Uint8Array,
  filePath: string,
  projectId: string,
): Promise<TranslationEntry[]> {
  const entries: TranslationEntry[] = [];
  if (data.length < SECTOR_BYTES * 2) return entries;

  const header = data.subarray(0, SECTOR_BYTES);
  const locations = parseChunkLocations(header);

  for (let chunkIndex = 0; chunkIndex < locations.length; chunkIndex++) {
    const loc = locations[chunkIndex]!;
    const start = loc.sectorOffset * SECTOR_BYTES;
    const end = start + loc.sectorCount * SECTOR_BYTES;
    if (end > data.length) continue;

    const sectorData = data.subarray(start, end);
    const nbtBytes = extractChunkNbt(sectorData);
    if (!nbtBytes || nbtBytes.length === 0) continue;

    try {
      const root = await parseNbt(nbtBytes);
      const chunkPath = `chunk[${chunkIndex}]`;
      extractFromNbtTree(root, chunkPath, filePath, projectId, 'mca', entries);
    } catch {
      /* skip chunk */
    }
  }

  return entries;
}
