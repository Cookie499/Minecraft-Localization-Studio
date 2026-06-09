export type VirtualFileContent = string | Uint8Array;

export interface VirtualFile {
  path: string;
  content: VirtualFileContent;
  isBinary: boolean;
}

export type VirtualFileTree = VirtualFile[];

export function isTextFile(file: VirtualFile): file is VirtualFile & { content: string } {
  return !file.isBinary && typeof file.content === 'string';
}

export function getFileText(file: VirtualFile): string | null {
  if (isTextFile(file)) return file.content;
  return null;
}

export function findFile(tree: VirtualFileTree, path: string): VirtualFile | undefined {
  const normalized = path.replace(/\\/g, '/');
  return tree.find((f) => f.path.replace(/\\/g, '/') === normalized);
}

export function listFiles(tree: VirtualFileTree, pattern: RegExp): VirtualFile[] {
  return tree.filter((f) => pattern.test(f.path.replace(/\\/g, '/')));
}
