/**
 * Unit test for pipeline/nodes/retrieve.ts — verifies that hits returned
 * by the Pinecone search API are correctly hydrated into the v2
 * `ChunkMetadata` shape, including the fields added in M4 Issue A
 * (`authority`, `versionStatus`, `topicTags`, `paragraphPath`).
 */

import { describe, it, expect } from "vitest";
import { createRetrieveNode } from "../../pipeline/nodes/retrieve";
import type { GraphState } from "../../pipeline/state";

// Minimal shape matching what pipeline/nodes/retrieve.ts uses from Pinecone.
type FakeHit = {
  _id: string;
  _score: number;
  fields: Record<string, unknown>;
};

function makeFakeIndex(hits: FakeHit[]) {
  return {
    searchRecords: async () => ({ result: { hits } }),
    // The retrieve node only calls searchRecords — other Pinecone methods
    // on the index proxy are not exercised here.
  } as unknown as Parameters<typeof createRetrieveNode>[0];
}

describe("pipeline/nodes/retrieve — v2 metadata hydration", () => {
  it("populates authority, versionStatus, topicTags, and paragraphPath from hit fields", async () => {
    const hits: FakeHit[] = [
      {
        _id: "17-CFR-240.15l-1::(a)(2)(ii)::p0",
        _score: 0.91,
        fields: {
          title: "Reg BI",
          source: "SEC",
          authority: "SEC",
          citation_id: "17-CFR-240.15l-1",
          citation_id_display: "17 CFR 240.15l-1",
          jurisdiction: "US-Federal",
          doc_type: "regulation",
          effective_date: "2020-06-30",
          source_url: "https://example.gov/reg-bi",
          version_status: "current",
          topic_tags: ["best-interest", "retail-customers"],
          heading_path: "§ 240.15l-1 > (a) > (2)",
          paragraph_path: "(a)(2)(ii)",
          chunk_index: 0,
          chunk_text: "The broker-dealer must have a reasonable basis…",
        },
      },
    ];

    const node = createRetrieveNode(makeFakeIndex(hits));
    const out = (await node({
      query: "best-interest recommendations",
      retrievals: [],
    } as unknown as GraphState)) as Partial<GraphState>;

    expect(out.retrievals).toBeDefined();
    const r = out.retrievals![0];
    expect(r.chunkId).toBe("17-CFR-240.15l-1::(a)(2)(ii)::p0");
    expect(r.metadata?.authority).toBe("SEC");
    expect(r.metadata?.citationIdDisplay).toBe("17 CFR 240.15l-1");
    expect(r.metadata?.versionStatus).toBe("current");
    expect(r.metadata?.topicTags).toEqual([
      "best-interest",
      "retail-customers",
    ]);
    expect(r.metadata?.paragraphPath).toBe("(a)(2)(ii)");
    expect(r.metadata?.headingPath).toBe("§ 240.15l-1 > (a) > (2)");
  });

  it("applies safe defaults for legacy records missing v2 fields", async () => {
    const hits: FakeHit[] = [
      {
        _id: "legacy-record::chunk_0",
        _score: 0.5,
        fields: {
          title: "Legacy",
          source: "Internal",
          citation_id: "legacy-record",
          jurisdiction: "Internal",
          doc_type: "internal",
          effective_date: "2024-01-01",
          source_url: "internal://legacy",
          heading_path: "A > B",
          chunk_index: 0,
          chunk_text: "Old record body.",
          // authority, version_status, topic_tags, paragraph_path intentionally absent
        },
      },
    ];

    const node = createRetrieveNode(makeFakeIndex(hits));
    const out = (await node({
      query: "legacy",
      retrievals: [],
    } as unknown as GraphState)) as Partial<GraphState>;

    const r = out.retrievals![0];
    // Defaults defined in pipeline/nodes/retrieve.ts.
    expect(r.metadata?.authority).toBe("Kestrel");
    expect(r.metadata?.versionStatus).toBe("current");
    expect(r.metadata?.topicTags).toEqual([]);
    expect(r.metadata?.paragraphPath).toBe("");
  });
});
