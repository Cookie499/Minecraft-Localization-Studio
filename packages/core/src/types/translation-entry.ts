export type TranslationStatus =
  | 'untranslated'
  | 'translated'
  | 'review'
  | 'approved';

export interface TranslationEntry {
  id: string;
  projectId: string;
  key: string;
  original: string;
  translation: string;
  sourceFile: string;
  sourceType: string;
  sourcePath: string;
  context: string[];
  references: string[];
  tags: string[];
  status: TranslationStatus;
  aiGenerated: boolean;
}

export interface ProjectMeta {
  id: string;
  name: string;
  importedAt: string;
  fileCount: number;
}

export interface ProjectWorkspace {
  project: ProjectMeta;
  entries: TranslationEntry[];
}

export interface CompleteProjectFile {
  format: 'minecraft-localization-studio-project';
  version: 1;
  exportedAt: string;
  project: ProjectMeta;
  entries: TranslationEntry[];
  files: Array<{
    path: string;
    isBinary: boolean;
    encoding: 'utf8' | 'base64';
    content: string;
  }>;
}
