export function makeEntryId(projectId: string, sourceFile: string, sourcePath: string): string {
  const safe = `${sourceFile}::${sourcePath}`.replace(/[^a-zA-Z0-9._\-:/[\]]/g, '_');
  return `${projectId}:${safe}`;
}

function slug(value: string): string {
  return value
    .replace(/\\/g, '/')
    .replace(/\.[^.\/]+$/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .toLowerCase();
}

function hashLocation(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, '0').slice(0, 7);
}

export function makeTranslationKey(
  sourceType: string,
  sourceFile: string,
  sourcePath: string,
): string {
  const normalizedFile = sourceFile.replace(/\\/g, '/');
  const withoutRoots = normalizedFile
    .replace(/^(?:.*?\/)?(?:data|assets)\//i, '')
    .replace(/\.(?:json|mcmeta|mcfunction|nbt|dat|mca)$/i, '');
  const readable = [slug(sourceType), slug(withoutRoots), slug(sourcePath)]
    .filter(Boolean)
    .join('.')
    .split('.')
    .slice(-10)
    .join('.');
  const locationHash = hashLocation(`${normalizedFile}::${sourcePath}`);
  return `mls.${readable || 'entry'}.${locationHash}`;
}
