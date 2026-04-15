/**
 * Ingestion CLI: loads corpus/*.md → chunks → upserts to Pinecone.
 *
 * Usage:
 *   pnpm ingest
 *   (or)  tsx scripts/ingest.ts
 *
 * Required env vars:
 *   PINECONE_API_KEY   – your Pinecone API key
 *   PINECONE_INDEX     – the name of your integrated-embedding index
 */

import "dotenv/config";
import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import matter from "gray-matter";
import { Pinecone } from "@pinecone-database/pinecone";
import { chunkDocument } from "../ingest/chunk";
import { upsertChunks } from "../ingest/upsert";
import type { ChunkMetadata } from "../shared/types";

// ---------------------------------------------------------------------------
// Environment validation (fail fast before any network call)
// ---------------------------------------------------------------------------

const PINECONE_API_KEY = process.env["PINECONE_API_KEY"];
const PINECONE_INDEX = process.env["PINECONE_INDEX"];

if (!PINECONE_API_KEY) {
  console.error(
    JSON.stringify({
      error: "Missing env var: PINECONE_API_KEY",
      message:
        "Set PINECONE_API_KEY to your Pinecone API key before running ingest.",
    })
  );
  process.exit(1);
}

if (!PINECONE_INDEX) {
  console.error(
    JSON.stringify({
      error: "Missing env var: PINECONE_INDEX",
      message:
        "Set PINECONE_INDEX to the name of your Pinecone integrated-embedding index.",
    })
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Startup: verify index connectivity
// ---------------------------------------------------------------------------

const pc = new Pinecone({ apiKey: PINECONE_API_KEY });

async function main(): Promise<void> {
  // Assert index is reachable.
  const indexModel = await pc.describeIndex(PINECONE_INDEX!);
  console.log(
    JSON.stringify({
      event: "index_verified",
      index: indexModel.name,
      host: indexModel.host,
    })
  );

  // ---------------------------------------------------------------------------
  // Discover corpus files
  // ---------------------------------------------------------------------------

  const corpusDir = resolve(process.cwd(), "corpus");
  const files = readdirSync(corpusDir)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .map((f) => join(corpusDir, f));

  const startMs = Date.now();
  let totalChunks = 0;
  let docsProcessed = 0;

  for (const filePath of files) {
    const fileName = filePath.split("/").pop() ?? filePath;
    try {
      const raw = readFileSync(filePath, "utf8");
      const { data: frontMatter, content: markdownBody } = matter(raw);

      // Validate required front-matter fields.
      const requiredFields = [
        "title",
        "source",
        "citation_id",
        "citation_id_display",
        "jurisdiction",
        "doc_type",
        "effective_date",
        "source_url",
      ];
      const missing = requiredFields.filter((f) => !frontMatter[f]);
      if (missing.length > 0) {
        console.log(
          JSON.stringify({
            file: fileName,
            status: "skipped",
            reason: `Missing front-matter fields: ${missing.join(", ")}`,
          })
        );
        continue;
      }

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
        citationIdDisplay: String(frontMatter["citation_id_display"]),
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

      await upsertChunks(pc, PINECONE_INDEX!, chunks);

      totalChunks += chunks.length;
      docsProcessed++;

      console.log(
        JSON.stringify({
          file: fileName,
          chunks_produced: chunks.length,
          status: "ok",
        })
      );
    } catch (err) {
      console.error(
        JSON.stringify({
          file: fileName,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        })
      );
      // Fail fast on unexpected errors.
      process.exit(1);
    }
  }

  // ---------------------------------------------------------------------------
  // Final summary line
  // ---------------------------------------------------------------------------

  console.log(
    JSON.stringify({
      docs: docsProcessed,
      total_chunks: totalChunks,
      duration_ms: Date.now() - startMs,
    })
  );
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      message: "Ingest failed unexpectedly.",
    })
  );
  process.exit(1);
});
