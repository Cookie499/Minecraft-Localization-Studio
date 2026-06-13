import nbt from 'prismarine-nbt';
import { ungzip } from 'pako';
import {
  assertNbtStringsWellFormed,
  modifiedUtf8NbtToStandard,
  standardUtf8NbtToModified,
} from './modified-utf8.js';

export interface NbtValue {
  type: string;
  value: unknown;
  name?: string;
}

export async function parseNbt(buffer: Uint8Array): Promise<NbtValue> {
  const bytes = buffer[0] === 0x1f && buffer[1] === 0x8b
    ? ungzip(buffer)
    : buffer;
  const data = modifiedUtf8NbtToStandard(Uint8Array.from(bytes)).buffer;
  const { parsed } = await nbt.parse(data, 'big');
  return parsed as NbtValue;
}

export async function serializeNbt(root: NbtValue): Promise<Uint8Array> {
  assertNbtStringsWellFormed(root);
  const encoded = await nbt.writeUncompressed(root as never);
  return standardUtf8NbtToModified(new Uint8Array(encoded));
}

export function getCompoundValue(node: NbtValue | unknown): Record<string, unknown> | null {
  if (!node || typeof node !== 'object') return null;
  const n = node as NbtValue;
  if (n.type === 'compound' && typeof n.value === 'object' && n.value !== null) {
    return n.value as Record<string, unknown>;
  }
  return null;
}
