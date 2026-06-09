import { extractAdvancements, extractLootTables, extractPackMcmeta } from './json-text.js';
import { extractMcaRegions } from './mca.js';
import { extractMcFunctions } from './mcfunction.js';
import { extractLevelDat, extractPlayerData, extractStructureNbt } from './nbt-files.js';
import { ExtractorRegistry } from './registry.js';

export function createDefaultExtractorRegistry(): ExtractorRegistry {
  return new ExtractorRegistry()
    .register({ id: 'pack.mcmeta', extract: ({ tree, projectId }) => extractPackMcmeta(tree, projectId) })
    .register({ id: 'advancement', extract: ({ tree, projectId }) => extractAdvancements(tree, projectId) })
    .register({ id: 'loot_table', extract: ({ tree, projectId }) => extractLootTables(tree, projectId) })
    .register({ id: 'mcfunction', extract: ({ tree, projectId }) => extractMcFunctions(tree, projectId) })
    .register({ id: 'structure', extract: ({ tree, projectId }) => extractStructureNbt(tree, projectId) })
    .register({ id: 'level.dat', extract: ({ tree, projectId }) => extractLevelDat(tree, projectId) })
    .register({ id: 'playerdata', extract: ({ tree, projectId }) => extractPlayerData(tree, projectId) })
    .register({ id: 'mca', extract: ({ tree, projectId }) => extractMcaRegions(tree, projectId) });
}
