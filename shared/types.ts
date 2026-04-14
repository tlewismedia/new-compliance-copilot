// Single source of truth for shared types.
// These stubs are intentionally thin — M1/M2 will refine them.

export interface Citation {
  readonly chunkId: string;
  readonly marker: string;
}

export interface Retrieval {
  readonly chunkId: string;
  readonly text: string;
  readonly score: number;
}

export interface GraphState {
  readonly query: string;
  readonly retrievals: readonly Retrieval[];
  readonly answer?: string;
  readonly citations?: readonly Citation[];
}
