/**
 * Fallback-mode regression: Kestrel (internal) docs should use the legacy
 * H1/H2/H3 + sentence-packing chunker, with chunk IDs of the form
 * `${citationId}::chunk_${N}` — not the regulatory `::${path}::p${N}` form.
 */

import { describe, it, expect } from "vitest";
import { chunkDocument } from "../../ingest/chunk";
import type { ChunkMetadata } from "../../shared/types";

const KESTREL_METADATA: Omit<
  ChunkMetadata,
  "headingPath" | "chunkIndex" | "paragraphPath"
> = {
  title: "Kestrel WSP — Equities",
  source: "Kestrel Securities",
  authority: "Kestrel",
  citationId: "Kestrel-WSP-Equities",
  jurisdiction: "Internal",
  docType: "internal",
  effectiveDate: "2025-07-01",
  sourceUrl: "internal://kestrel/policies/wsp/equities.md",
  versionStatus: "current",
  topicTags: ["wsp", "equities"],
};

// A Kestrel-flavoured body that happens to contain something that *looks*
// like a CFR marker — the regulatory-mode matchers would detect it, but
// fallback-mode should not.
const FIXTURE_KESTREL = `
# Kestrel Securities — WSP: Equities Trading Desk

## 1. Purpose

These procedures implement Kestrel's supervisory system under FINRA Rule
3110. They apply to all associated persons of the desk.

## 2. Order entry

All customer orders are time-stamped on receipt and entered into the OMS
within 60 seconds. Phone orders receive a same-day review.
`.trim();

describe("Fallback mode for Kestrel internal docs", () => {
  it("produces chunk IDs of the form `Kestrel-WSP-Equities::chunk_N`", () => {
    const chunks = chunkDocument(FIXTURE_KESTREL, KESTREL_METADATA);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.id).toMatch(/^Kestrel-WSP-Equities::chunk_\d+$/);
    }
  });

  it("assigns an empty paragraphPath to fallback chunks", () => {
    const chunks = chunkDocument(FIXTURE_KESTREL, KESTREL_METADATA);
    for (const chunk of chunks) {
      expect(chunk.metadata.paragraphPath).toBe("");
    }
  });

  it("still populates headingPath from H1/H2 headers", () => {
    const chunks = chunkDocument(FIXTURE_KESTREL, KESTREL_METADATA);
    const hasNested = chunks.some((c) =>
      c.metadata.headingPath.includes("Kestrel Securities")
    );
    expect(hasNested).toBe(true);
  });
});

describe("Fallback mode for FinCEN docs", () => {
  it("also uses the legacy chunk_N ID format", () => {
    const meta: Omit<
      ChunkMetadata,
      "headingPath" | "chunkIndex" | "paragraphPath"
    > = {
      ...KESTREL_METADATA,
      authority: "FinCEN",
      citationId: "31-CFR-Part-1023",
      jurisdiction: "US-Federal",
      docType: "regulation",
    };
    const chunks = chunkDocument(FIXTURE_KESTREL, meta);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.id).toMatch(/^31-CFR-Part-1023::chunk_\d+$/);
    }
  });
});
