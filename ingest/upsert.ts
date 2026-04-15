import { Pinecone } from "@pinecone-database/pinecone";
import type { Chunk } from "../shared/types";

const BATCH_SIZE = 100;

type PineconeIngestRecord = {
  id: string;
  chunk_text: string;
  title: string;
  source: string;
  authority: string;
  citation_id: string;
  jurisdiction: string;
  doc_type: string;
  effective_date: string;
  source_url: string;
  version_status: string;
  topic_tags: string[];
  chunk_index: number;
  heading_path: string;
  paragraph_path: string;
  [key: string]: string | number | boolean | string[];
};

function chunkToRecord(chunk: Chunk): PineconeIngestRecord {
  const m = chunk.metadata;
  return {
    id: chunk.id,
    chunk_text: chunk.text,
    title: m.title,
    source: m.source,
    authority: m.authority,
    citation_id: m.citationId,
    jurisdiction: m.jurisdiction,
    doc_type: m.docType,
    effective_date: m.effectiveDate,
    source_url: m.sourceUrl,
    version_status: m.versionStatus,
    topic_tags: [...m.topicTags],
    chunk_index: m.chunkIndex,
    heading_path: m.headingPath,
    paragraph_path: m.paragraphPath,
  };
}

export async function upsertChunks(
  pc: Pinecone,
  indexName: string,
  chunks: Chunk[]
): Promise<void> {
  if (chunks.length === 0) return;

  const index = pc.index(indexName);
  const records = chunks.map(chunkToRecord);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    await index.upsertRecords({ records: records.slice(i, i + BATCH_SIZE) });
  }
}
