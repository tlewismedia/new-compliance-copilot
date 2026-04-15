/**
 * Integration test: ingest one corpus file and verify it can be retrieved.
 *
 * Skipped automatically when PINECONE_API_KEY is not set.
 * Run with real creds to execute against the live index.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import matter from "gray-matter";
import { Pinecone } from "@pinecone-database/pinecone";
import { chunkDocument } from "../../ingest/chunk";
import { upsertChunks } from "../../ingest/upsert";
import type { ChunkMetadata } from "../../shared/types";

const hasCreds = Boolean(process.env["PINECONE_API_KEY"]);
const indexName = process.env["PINECONE_INDEX"] ?? "";

describe.skipIf(!hasCreds)("Ingest round-trip (requires Pinecone creds)", () => {
  it(
    "ingests ffiec-cat-domain-5.md and retrieves a known chunk",
    async () => {
      const apiKey = process.env["PINECONE_API_KEY"]!;
      const pc = new Pinecone({ apiKey });

      // Ingest a regulatory corpus file — exercises the citation-aware
      // chunker path. The expected pinpoint is FINRA Rule 5310
      // Supplementary Material .09 (best execution for fixed income).
      const corpusPath = resolve(
        process.cwd(),
        "corpus/finra-5310-best-execution.md"
      );
      const raw = readFileSync(corpusPath, "utf8");
      const { data: frontMatter, content: markdownBody } = matter(raw);

      const rawTopicTags = frontMatter["topic_tags"];
      const topicTags: readonly string[] = Array.isArray(rawTopicTags)
        ? rawTopicTags.map((t) => String(t))
        : [];

      const baseMetadata: Omit<
        ChunkMetadata,
        "headingPath" | "chunkIndex" | "paragraphPath"
      > = {
        title: String(frontMatter["title"]),
        source: String(frontMatter["source"]),
        authority: String(
          frontMatter["authority"] ?? "Kestrel"
        ) as ChunkMetadata["authority"],
        citationId: String(frontMatter["citation_id"]),
        jurisdiction: String(
          frontMatter["jurisdiction"]
        ) as ChunkMetadata["jurisdiction"],
        docType: String(
          frontMatter["doc_type"]
        ) as ChunkMetadata["docType"],
        effectiveDate: String(frontMatter["effective_date"]),
        sourceUrl: String(frontMatter["source_url"]),
        versionStatus: String(
          frontMatter["version_status"] ?? "current"
        ) as ChunkMetadata["versionStatus"],
        topicTags,
      };

      const chunks = chunkDocument(markdownBody, baseMetadata);
      expect(chunks.length).toBeGreaterThan(0);

      await upsertChunks(pc, indexName, chunks);

      // Poll until the record is searchable (up to 5 attempts × 2 s).
      const index = pc.index(indexName);
      const knownSubstring = "best execution for fixed income";
      let topHitId: string | undefined;

      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise((r) => setTimeout(r, 2000));

        const response = await index.searchRecords({
          query: {
            inputs: { text: knownSubstring },
            topK: 3,
          },
        });

        const hits = response.result?.hits ?? [];
        if (hits.length > 0) {
          topHitId = hits[0]._id;
          break;
        }
      }

      expect(topHitId).toBeDefined();
      // Chunk IDs for regulatory (FINRA) docs use the citation-aware format
      // `${citationId}::${paragraphPath}::p${N}`.
      expect(topHitId).toMatch(/^FINRA-Rule-5310::\.\d{2}::p\d+$/);
    },
    60_000 // 60 s timeout for network calls + polling
  );
});
