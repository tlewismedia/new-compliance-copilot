// Single source of truth for shared types.
// These stubs are intentionally thin — M1/M2 will refine them.

export interface Citation {
  readonly chunkId: string;
  readonly marker: string;
}

export interface ChunkMetadata {
  readonly title: string;
  readonly source: string;
  readonly authority: "SEC" | "FINRA" | "MSRB" | "FinCEN" | "Kestrel";
  readonly citationId: string;
  readonly jurisdiction: "US-Federal" | "SRO" | "Internal";
  readonly docType:
    | "regulation"
    | "rule"
    | "guidance"
    | "enforcement"
    | "internal"
    | "operational";
  readonly effectiveDate: string;
  readonly sourceUrl: string;
  readonly versionStatus: "current" | "proposed" | "superseded";
  readonly topicTags: readonly string[];
  readonly headingPath: string;
  readonly paragraphPath: string;
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

export interface QueryResponse {
  readonly answer: string;
  readonly citations: Citation[];
  readonly retrievals: Retrieval[];
}

// GraphState is derived from the LangGraph annotation in pipeline/state.ts.
export type { GraphState } from "../pipeline/state";
