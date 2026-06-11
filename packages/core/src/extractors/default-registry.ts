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
    .register({ id: 'structure', extract: ({ tree, projectId, nbtOptions }) => extractStructureNbt(tree, projectId, nbtOptions) })
    .register({ id: 'level.dat', extract: ({ tree, projectId, nbtOptions }) => extractLevelDat(tree, projectId, nbtOptions) })
    .register({ id: 'playerdata', extract: ({ tree, projectId, nbtOptions }) => extractPlayerData(tree, projectId, nbtOptions) })
    .register({ id: 'mca', extract: ({ tree, projectId, nbtOptions }) => extractMcaRegions(tree, projectId, nbtOptions) });
}
