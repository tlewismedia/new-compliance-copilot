// Single source of truth for shared types.
// These stubs are intentionally thin — M1/M2 will refine them.

export interface Citation {
  readonly chunkId: string;
  readonly marker: string;
}

export interface ChunkMetadata {
  readonly title: string;
  readonly source: string;
  readonly citationId: string;
  readonly jurisdiction: string;
  readonly docType: string;
  readonly effectiveDate: string;
  readonly sourceUrl: string;
  readonly headingPath: string;
  readonly chunkIndex: number;
}

export interface Retrieval {
  readonly chunkId: string;
  readonly text: string;
  readonly score: number;
  readonly metadata?: ChunkMetadata;
}

export interface Chunk {
  readonly id: string;
  readonly text: string;
  readonly metadata: ChunkMetadata;
}

// GraphState is derived from the LangGraph annotation in pipeline/state.ts.
export type { GraphState } from "../pipeline/state";
