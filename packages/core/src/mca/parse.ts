import { deflate, gzip, inflate, ungzip } from 'pako';
import { parseNbt, serializeNbt } from '../nbt/parse.js';
import { applyNbtTranslations } from '../nbt/patch.js';
import { extractFromNbtTree, type NbtScanOptions } from '../nbt/traverse.js';
import type { TranslationEntry } from '../types/translation-entry.js';

const SECTOR_BYTES = 4096;
const HEADER_BYTES = SECTOR_BYTES * 2;

interface ChunkLocation {
  tableIndex: number;
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
      locations.push({ tableIndex: i, sectorOffset, sectorCount });
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

function encodeChunkNbt(data: Uint8Array, compression: number): Uint8Array | null {
  if (compression === 1) return gzip(data);
  if (compression === 2) return deflate(data);
  if (compression === 3) return data;
  return null;
}

function concatBytes(parts: Uint8Array[], length: number): Uint8Array {
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export async function extractFromMcaFile(
  data: Uint8Array,
  filePath: string,
  projectId: string,
  nbtOptions?: NbtScanOptions,
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
      extractFromNbtTree(
        root,
        chunkPath,
        filePath,
        projectId,
        'mca',
        entries,
        '',
        nbtOptions,
      );
    } catch {
      /* skip chunk */
    }
  }

  return entries;
}

export async function patchMcaFile(
  data: Uint8Array,
  entries: TranslationEntry[],
): Promise<{ data: Uint8Array; applied: number }> {
  if (data.length < HEADER_BYTES || !entries.some((entry) => entry.translation)) {
    return { data, applied: 0 };
  }

  const locations = parseChunkLocations(data.subarray(0, SECTOR_BYTES));
  const locationHeader = new Uint8Array(SECTOR_BYTES);
  const timestampHeader = data.slice(SECTOR_BYTES, HEADER_BYTES);
  const chunks: Uint8Array[] = [];
  let nextSector = 2;
  let applied = 0;
  const appendChunk = (
    chunkData: Uint8Array,
    tableIndex: number,
    sectorCount: number,
  ) => {
    chunks.push(chunkData);
    const locationValue = (nextSector << 8) | sectorCount;
    new DataView(locationHeader.buffer).setUint32(tableIndex * 4, locationValue, false);
    nextSector += sectorCount;
  };

  for (let chunkIndex = 0; chunkIndex < locations.length; chunkIndex++) {
    const location = locations[chunkIndex]!;
    const start = location.sectorOffset * SECTOR_BYTES;
    const allocatedEnd = start + location.sectorCount * SECTOR_BYTES;
    if (allocatedEnd > data.length || start + 5 > data.length) {
      return { data, applied: 0 };
    }

    const sourceView = new DataView(data.buffer, data.byteOffset + start, allocatedEnd - start);
    const sourceLength = sourceView.getInt32(0, false);
    if (sourceLength <= 1 || sourceLength + 4 > allocatedEnd - start) {
      appendChunk(data.slice(start, allocatedEnd), location.tableIndex, location.sectorCount);
      continue;
    }

    const compressionByte = data[start + 4]!;
    const compression = compressionByte & 0x7f;
    const sourcePayload = data.slice(start + 5, start + 4 + sourceLength);
    let outputPayload = sourcePayload;
    const chunkEntries = entries.filter((entry) =>
      entry.translation && entry.sourcePath.startsWith(`chunk[${chunkIndex}]`));

    if (chunkEntries.length > 0 && (compressionByte & 0x80) === 0) {
      const nbtBytes = extractChunkNbt(data.subarray(start, allocatedEnd));
      if (nbtBytes) {
        try {
          const root = await parseNbt(nbtBytes);
          const chunkApplied = applyNbtTranslations(
            root,
            chunkEntries,
            `chunk[${chunkIndex}]`,
          );
          if (chunkApplied > 0) {
            const encoded = encodeChunkNbt(await serializeNbt(root), compression);
            if (encoded) {
              outputPayload = Uint8Array.from(encoded);
              applied += chunkApplied;
            }
          }
        } catch {
          // Preserve the original chunk if it cannot be parsed or serialized.
        }
      }
    }

    const storedLength = outputPayload.length + 1;
    const usedBytes = storedLength + 4;
    const sectorCount = Math.ceil(usedBytes / SECTOR_BYTES);
    if (sectorCount > 255) {
      throw new Error(`Chunk ${chunkIndex} exceeds the MCA 255-sector limit after patching.`);
    }

    const chunkData = new Uint8Array(sectorCount * SECTOR_BYTES);
    const chunkView = new DataView(chunkData.buffer);
    chunkView.setInt32(0, storedLength, false);
    chunkData[4] = compressionByte;
    chunkData.set(outputPayload, 5);
    appendChunk(chunkData, location.tableIndex, sectorCount);
  }

  if (applied === 0) return { data, applied: 0 };
  return {
    data: concatBytes([locationHeader, timestampHeader, ...chunks], nextSector * SECTOR_BYTES),
    applied,
  };
}
