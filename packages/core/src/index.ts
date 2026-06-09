export type {
  TranslationEntry,
  TranslationStatus,
  ProjectMeta,
  ProjectWorkspace,
} from './types/translation-entry.js';

export type { VirtualFile, VirtualFileTree, VirtualFileContent } from './types/virtual-file.js';
export {
  isTextFile,
  getFileText,
  findFile,
  listFiles,
} from './types/virtual-file.js';

export {
  scanFromFileList,
  scanFromDirectoryHandle,
  pickDirectory,
  scanFromZipFile,
  expandNestedDataPackZips,
  discoverScanTargets,
  filterTreeBySelection,
  filterTreeByTargets,
} from './scanner/index.js';
export type {
  LangFileCandidate,
  LangTranslationPlan,
  ScanDiscovery,
  ScanSelection,
  ScanTarget,
  ScanTargetKind,
} from './scanner/index.js';

export { WorkspaceStore, createProjectId, getWorkspaceDb } from './workspace/store.js';

export { extractLangPlans } from './extractors/lang.js';
export {
  extractPackMcmeta,
  extractAdvancements,
  extractLootTables,
} from './extractors/json-text.js';
export { extractMcFunctions } from './extractors/mcfunction.js';
export {
  extractStructureNbt,
  extractLevelDat,
  extractPlayerData,
  extractAllNbtFiles,
} from './extractors/nbt-files.js';
export { extractMcaRegions, findMcaFiles } from './extractors/mca.js';
export { ExtractorRegistry } from './extractors/registry.js';
export type { Extractor, ExtractorContext } from './extractors/registry.js';
export { createDefaultExtractorRegistry } from './extractors/default-registry.js';
export { extractAllFromTree } from './pipeline/extract-all.js';

export {
  extractStrings,
  extractedDisplayText,
  applyTranslation,
} from './text-component/index.js';
export type { ExtractedText, TextPatch } from './text-component/index.js';

export { parseNbt, serializeNbt } from './nbt/parse.js';
export { extractFromNbtTree, shouldExtractNbtString } from './nbt/traverse.js';

export {
  buildPatchedTree,
  applyLangPatches,
} from './builder/json-patch.js';
export type { BuildOptions } from './builder/json-patch.js';
export { exportTreeAsZip, downloadBlob, downloadJson } from './builder/zip-export.js';

export { makeEntryId, makeTranslationKey } from './utils/id.js';
