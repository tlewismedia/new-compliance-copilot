/**
 * Fallback-mode regression: Kestrel (internal) docs should use the
 * H1/H2/H3 + sentence-packing chunker, with heading-slug chunk IDs of the
 * form `${citationId}::${slug}` (or `::${slug}::p${N}` when a section
 * overflows the token budget).
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
  citationIdDisplay: "Kestrel WSP — Equities",
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

// Heading slug regex: citationId :: slug (:: pN optional)
const HEADING_SLUG_RE = /^[A-Za-z0-9._()-]+::[a-z0-9.-]+(::p\d+)?$/;

describe("Fallback mode for Kestrel internal docs", () => {
  it("produces chunk IDs of the heading-slug form", () => {
    const chunks = chunkDocument(FIXTURE_KESTREL, KESTREL_METADATA);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.id).toMatch(HEADING_SLUG_RE);
    }
  });

  it("no chunk ID contains chunk_N", () => {
    const chunks = chunkDocument(FIXTURE_KESTREL, KESTREL_METADATA);
    for (const chunk of chunks) {
      expect(chunk.id).not.toMatch(/::chunk_\d+/);
    }
  });

  it("heading slug is derived from the section heading", () => {
    const chunks = chunkDocument(FIXTURE_KESTREL, KESTREL_METADATA);
    // The "1. Purpose" section should slug to "1.-purpose" or similar
    const purposeChunk = chunks.find((c) =>
      c.metadata.headingPath.includes("Purpose")
    );
    expect(purposeChunk).toBeDefined();
    expect(purposeChunk!.id).toContain("Kestrel-WSP-Equities::");
    // Slug should be lowercase and hyphenated
    const slugPart = purposeChunk!.id.split("::")[1];
    expect(slugPart).toMatch(/^[a-z0-9.-]+$/);
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
  it("also uses the heading-slug ID format", () => {
    const meta: Omit<
      ChunkMetadata,
      "headingPath" | "chunkIndex" | "paragraphPath"
    > = {
      ...KESTREL_METADATA,
      authority: "FinCEN",
      citationId: "31-CFR-Part-1023",
      citationIdDisplay: "31 CFR Part 1023",
      jurisdiction: "US-Federal",
      docType: "regulation",
    };
    const chunks = chunkDocument(FIXTURE_KESTREL, meta);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.id).toMatch(HEADING_SLUG_RE);
      expect(chunk.id).not.toMatch(/::chunk_\d+/);
    }
  });
});

// ---------------------------------------------------------------------------
// Collision test (Acceptance B4): two H2 headings that slug to the same string
// ---------------------------------------------------------------------------

describe("Collision handling: same-slug headings get -2 suffix", () => {
  /**
   * Both sections have the heading "Overview" (same slug: "overview").
   * The second should get the suffix "-2".
   */
  const FIXTURE_COLLISION = `
# Document

## Overview

First overview section with enough text to produce a chunk.

## Overview

Second overview section — same heading, different content.
`.trim();

  const META: Omit<ChunkMetadata, "headingPath" | "chunkIndex" | "paragraphPath"> = {
    title: "Collision Test",
    source: "Kestrel",
    authority: "Kestrel",
    citationId: "Kestrel-Best-Execution-Policy",
    citationIdDisplay: "Kestrel Best Execution Policy",
    jurisdiction: "Internal",
    docType: "internal",
    effectiveDate: "2025-01-01",
    sourceUrl: "internal://kestrel/best-execution.md",
    versionStatus: "current",
    topicTags: [],
  };

  it("first section keeps the base slug, second gets -2", () => {
    const chunks = chunkDocument(FIXTURE_COLLISION, META);
    const ids = chunks.map((c) => c.id);
    // The heading path is "Document > Overview" → slug "document-overview".
    // First occurrence: no collision suffix.
    expect(ids.some((id) => id.endsWith("::document-overview"))).toBe(true);
    // Second occurrence: -2 collision suffix.
    expect(ids.some((id) => id.endsWith("::document-overview-2"))).toBe(true);
  });

  it("all chunk IDs match the heading-slug regex", () => {
    const chunks = chunkDocument(FIXTURE_COLLISION, META);
    for (const chunk of chunks) {
      expect(chunk.id).toMatch(HEADING_SLUG_RE);
    }
  });
});

// ---------------------------------------------------------------------------
// Overflow test (Acceptance B5): one heading → multiple token-capped chunks
// ---------------------------------------------------------------------------

describe("Overflow handling: long section gets ::p0, ::p1 suffixes", () => {
  /**
   * Generate a body where a single H2 section is long enough to require
   * at least two chunks (~500 tokens / ~375 words each).
   * 60 sentences × ~19 words ≈ 1140 words → forces at least 2 chunks.
   */
  function longSection(sentences: number): string {
    const body: string[] = [];
    for (let i = 1; i <= sentences; i++) {
      body.push(
        `This is sentence number ${i} with enough words to push the total word count well past the per-chunk budget.`
      );
    }
    return body.join(" ");
  }

  const FIXTURE_OVERFLOW = `
# Kestrel Best Execution Policy

## Overview

${longSection(60)}
`.trim();

  const META: Omit<ChunkMetadata, "headingPath" | "chunkIndex" | "paragraphPath"> = {
    title: "Overflow Test",
    source: "Kestrel",
    authority: "Kestrel",
    citationId: "Kestrel-Best-Execution-Policy",
    citationIdDisplay: "Kestrel Best Execution Policy",
    jurisdiction: "Internal",
    docType: "internal",
    effectiveDate: "2025-01-01",
    sourceUrl: "internal://kestrel/best-execution.md",
    versionStatus: "current",
    topicTags: [],
  };

  it("produces ::p0 and ::p1 IDs for a long single-section doc", () => {
    const chunks = chunkDocument(FIXTURE_OVERFLOW, META);
    const ids = chunks.map((c) => c.id);
    // The heading path "Kestrel Best Execution Policy > Overview" slugifies to
    // "kestrel-best-execution-policy-overview". The long section splits into
    // multiple chunks, so they get the ::p0, ::p1, … overflow suffix.
    expect(ids.some((id) => id.includes("::p0"))).toBe(true);
    expect(ids.some((id) => id.includes("::p1"))).toBe(true);
  });

  it("all chunk IDs match the heading-slug regex", () => {
    const chunks = chunkDocument(FIXTURE_OVERFLOW, META);
    for (const chunk of chunks) {
      expect(chunk.id).toMatch(HEADING_SLUG_RE);
    }
  });
});
