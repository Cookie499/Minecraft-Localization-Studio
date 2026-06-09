import nbt from 'prismarine-nbt';

export interface NbtValue {
  type: string;
  value: unknown;
}

export async function parseNbt(buffer: Uint8Array): Promise<NbtValue> {
  const { parsed } = await nbt.parse(buffer);
  return simplifyNbt(parsed) as NbtValue;
}

export async function serializeNbt(root: NbtValue): Promise<Uint8Array> {
  // prismarine-nbt types expect its internal NBT shape
  const encoded = await nbt.writeUncompressed(restoreNbt(root) as never);
  return new Uint8Array(encoded);
}

function simplifyNbt(node: unknown): unknown {
  if (node === null || node === undefined) return node;
  if (typeof node !== 'object') return node;

  if (Array.isArray(node)) {
    return node.map(simplifyNbt);
  }

  const record = node as Record<string, unknown>;
  if ('type' in record && 'value' in record) {
    const type = record.type as string;
    const value = record.value;

    if (type === 'compound') {
      const result: Record<string, unknown> = {};
      const compound = value as Record<string, { type: string; value: unknown }>;
      for (const [key, child] of Object.entries(compound)) {
        result[key] = simplifyNbt(child);
      }
      return { type: 'compound', value: result };
    }

    if (type === 'list') {
      const listVal = value as { type: { type: string }; value: unknown[] };
      return {
        type: 'list',
        value: (listVal.value ?? []).map((item) => simplifyNbt(item)),
      };
    }

    return { type, value: simplifyNbt(value) };
  }

  return node;
}

function restoreNbt(node: unknown): unknown {
  if (node === null || node === undefined) return node;
  if (typeof node !== 'object') return node;

  if (Array.isArray(node)) {
    return node.map(restoreNbt);
  }

  const record = node as Record<string, unknown>;
  if ('type' in record && 'value' in record) {
    const type = record.type as string;
    const value = record.value;

    if (type === 'compound') {
      const compound: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        compound[key] = restoreNbt(child);
      }
      return { type: 'compound', value: compound };
    }

    if (type === 'list') {
      return {
        type: 'list',
        value: {
          type: { type: 'end' },
          value: (value as unknown[]).map((item) => restoreNbt(item)),
        },
      };
    }

    return { type, value };
  }

  return node;
}

export function getCompoundValue(node: NbtValue | unknown): Record<string, unknown> | null {
  if (!node || typeof node !== 'object') return null;
  const n = node as NbtValue;
  if (n.type === 'compound' && typeof n.value === 'object' && n.value !== null) {
    return n.value as Record<string, unknown>;
  }
  return null;
}
