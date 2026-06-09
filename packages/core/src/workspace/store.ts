import Dexie, { type Table } from 'dexie';
import type { ProjectMeta, ProjectWorkspace, TranslationEntry } from '../types/translation-entry.js';
import type { VirtualFileTree, VirtualFileContent } from '../types/virtual-file.js';

interface StoredVirtualFile {
  id: string;
  projectId: string;
  path: string;
  content: VirtualFileContent;
  isBinary: boolean;
}

class WorkspaceDatabase extends Dexie {
  projects!: Table<ProjectMeta, string>;
  entries!: Table<TranslationEntry, string>;
  files!: Table<StoredVirtualFile, string>;

  constructor() {
    super('MinecraftLocalizationStudio');
    this.version(1).stores({
      projects: 'id, name, importedAt',
      entries: 'id, sourceFile, sourceType, status, *tags',
    });
    this.version(2).stores({
      projects: 'id, name, importedAt',
      entries: 'id, projectId, key, sourceFile, sourceType, status, *tags',
    }).upgrade((transaction) =>
      transaction.table<TranslationEntry, string>('entries').toCollection().modify((entry) => {
        entry.projectId ??= entry.id.split(':', 1)[0] ?? '';
        entry.key ??= entry.sourceType === 'lang' ? entry.sourcePath : entry.id;
      }),
    );
    this.version(3).stores({
      projects: 'id, name, importedAt',
      entries: 'id, projectId, key, sourceFile, sourceType, status, *tags',
      files: 'id, projectId, path',
    });
  }
}

let dbInstance: WorkspaceDatabase | null = null;

export function getWorkspaceDb(): WorkspaceDatabase {
  if (!dbInstance) {
    dbInstance = new WorkspaceDatabase();
  }
  return dbInstance;
}

export class WorkspaceStore {
  private db = getWorkspaceDb();

  async saveProject(meta: ProjectMeta): Promise<void> {
    await this.db.projects.put(meta);
  }

  async getProject(id: string): Promise<ProjectMeta | undefined> {
    return this.db.projects.get(id);
  }

  async listProjects(): Promise<ProjectMeta[]> {
    return this.db.projects.orderBy('importedAt').reverse().toArray();
  }

  async saveEntry(entry: TranslationEntry): Promise<void> {
    await this.db.entries.put(entry);
  }

  async saveEntries(entries: TranslationEntry[]): Promise<void> {
    await this.db.entries.bulkPut(entries);
  }

  async saveFileTree(projectId: string, tree: VirtualFileTree): Promise<void> {
    await this.db.transaction('rw', this.db.files, async () => {
      await this.db.files.where('projectId').equals(projectId).delete();
      await this.db.files.bulkPut(tree.map((file) => ({
        id: `${projectId}:${file.path}`,
        projectId,
        path: file.path,
        content: file.content,
        isBinary: file.isBinary,
      })));
    });
  }

  async loadFileTree(projectId: string): Promise<VirtualFileTree> {
    const files = await this.db.files.where('projectId').equals(projectId).sortBy('path');
    return files.map(({ path, content, isBinary }) => ({ path, content, isBinary }));
  }

  async getEntry(id: string): Promise<TranslationEntry | undefined> {
    return this.db.entries.get(id);
  }

  async listEntries(
    projectId: string,
    options?: { offset?: number; limit?: number; status?: TranslationEntry['status'] },
  ): Promise<TranslationEntry[]> {
    let collection = this.db.entries.where('projectId').equals(projectId);

    if (options?.status) {
      collection = collection.filter((e) => e.status === options.status);
    }

    const all = await collection.toArray();
    all.sort((a, b) => a.sourceFile.localeCompare(b.sourceFile) || a.sourcePath.localeCompare(b.sourcePath));

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? all.length;
    return all.slice(offset, offset + limit);
  }

  async countEntries(projectId: string): Promise<number> {
    return this.db.entries.where('projectId').equals(projectId).count();
  }

  async clearProject(projectId: string): Promise<void> {
    await this.db.entries.where('projectId').equals(projectId).delete();
    await this.db.files.where('projectId').equals(projectId).delete();
    await this.db.projects.delete(projectId);
  }

  async exportProjectJson(projectId: string): Promise<ProjectWorkspace> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    const entries = await this.listEntries(projectId);
    return { project, entries };
  }
}

export function createProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
