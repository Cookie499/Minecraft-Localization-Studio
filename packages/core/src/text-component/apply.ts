import type { TextPatch } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function setAtPath(root: unknown, path: string, value: string): unknown {
  if (!path || path === '/') {
    if (typeof root === 'string') return value;
    return root;
  }

  const segments = path.replace(/^\//, '').split('/').filter(Boolean);
  if (segments.length === 0) return root;

  const clone = cloneDeep(root);
  let current: unknown = clone;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    if (Array.isArray(current)) {
      const idx = Number(seg);
      current = current[idx];
    } else if (isRecord(current)) {
      current = current[seg];
    }
  }

  const last = segments[segments.length - 1]!;
  if (Array.isArray(current)) {
    const idx = Number(last);
    const item = current[idx];
    if (isRecord(item) && ('text' in item || 'translate' in item)) {
      if ('text' in item) (item as Record<string, unknown>).text = value;
    } else if (typeof item === 'string') {
      current[idx] = value;
    }
  } else if (isRecord(current)) {
    if (last === 'text' || last === 'translate') {
      if (last === 'translate') {
        delete current.translate;
        current.text = value;
      } else {
        current.text = value;
      }
    } else {
      current[last] = value;
    }
  }

  return clone;
}

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Apply translation patches to a Text Component (deep clone). */
export function applyTranslation(component: unknown, patches: TextPatch[]): unknown {
  let result = cloneDeep(component);
  for (const patch of patches) {
    result = setAtPath(result, patch.path, patch.newText);
  }
  return result;
}
