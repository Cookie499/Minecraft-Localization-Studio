import { extractAllFromTree } from '@mls/core';
import type { NbtScanOptions, VirtualFileTree } from '@mls/core';

export interface ExtractWorkerRequest {
  type: 'extract';
  projectId: string;
  tree: VirtualFileTree;
  nbtOptions: NbtScanOptions;
}

export interface ExtractWorkerResponse {
  type: 'progress' | 'done' | 'error';
  phase?: string;
  count?: number;
  phaseCount?: number;
  durationMs?: number;
  entries?: Awaited<ReturnType<typeof extractAllFromTree>>;
  message?: string;
}

self.onmessage = async (event: MessageEvent<ExtractWorkerRequest>) => {
  const { type, projectId, tree, nbtOptions } = event.data;
  if (type !== 'extract') return;

  try {
    const entries = await extractAllFromTree(tree, projectId, (p) => {
      const msg: ExtractWorkerResponse = {
        type: 'progress',
        phase: p.phase,
        count: p.count,
        phaseCount: p.phaseCount,
        durationMs: p.durationMs,
      };
      self.postMessage(msg);
    }, undefined, nbtOptions);
    const done: ExtractWorkerResponse = { type: 'done', entries };
    self.postMessage(done);
  } catch (err) {
    const msg: ExtractWorkerResponse = {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(msg);
  }
};
