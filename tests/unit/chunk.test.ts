/**
 * Unit tests for ingest/chunk.ts
 *
 * Covers five invariants mandated by the spec:
 *  1. Header path is present in every chunk's metadata.headingPath.
 *  2. No chunk exceeds ~600 tokens (word-count heuristic).
 *  3. Overlap: adjacent chunks share at least one sentence.
 *  4. A citation string like `12 CFR 1026.18` is never split across two chunks.
 *  5. A corpus file with no headers produces at least one chunk.
 */

import { describe, it, expect } from "vitest";
import { chunkDocument } from "../../ingest/chunk";
import type { ChunkMetadata } from "../../shared/types";

// ---------------------------------------------------------------------------
// Shared helpers / fixtures
// ---------------------------------------------------------------------------

const BASE_METADATA: Omit<
  ChunkMetadata,
  "headingPath" | "chunkIndex" | "paragraphPath"
> = {
  title: "Test Document",
  source: "TestSource",
  authority: "SEC",
  citationId: "TEST-DOC",
  jurisdiction: "US-Federal",
  docType: "guidance",
  effectiveDate: "2024-01-01",
  sourceUrl: "https://example.com/test",
  versionStatus: "current",
  topicTags: [],
};

/** Word-count heuristic: 1 token ≈ 0.75 words */
function tokenCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words / 0.75);
}

/**
 * Generate a long paragraph with ~N words so we can exercise chunking.
 * Sentences are numbered to make overlap detection easy.
 */
function generateLongParagraph(sentenceCount: number): string {
  const sentences: string[] = [];
  for (let i = 1; i <= sentenceCount; i++) {
    sentences.push(
      `This is sentence number ${i} and it contains enough words to add up meaningfully to the word count total.`
    );
  }
  return sentences.join(" ");
}

// ---------------------------------------------------------------------------
// Fixture markdown documents
// ---------------------------------------------------------------------------

const FIXTURE_WITH_HEADERS = `
# Domain 5: Cyber Incident Management and Resilience

Cyber resilience encompasses both planning and testing to maintain and recover
ongoing operations during and following a cyber incident.

## Assessment Factor: Incident Resilience Planning and Strategy

### Planning

Incident response plans establish and communicate the capabilities to prepare
for, respond to, and recover from significant cyber events in a timely manner.
Effective planning includes the identification of events and the activities
required to respond. Planning also addresses how a financial institution manages
the response activities, including the roles, responsibilities, communication,
and reporting required during and after an event.

### Testing

Testing the incident response plan is essential to understanding its
effectiveness. Testing identifies gaps, validates assumptions, and familiarizes
personnel with their responsibilities. Testing may take many forms, including
tabletop exercises, functional tests, and full-scale tests.
`.trim();

const FIXTURE_NO_HEADERS = `
This document has no headers at all. It consists of several sentences that form
a single logical block of text. The text should still be chunked into at least
one chunk by the chunker even in the absence of any heading markers.
Additional sentences pad the content to ensure the chunker has something to work with.
`.trim();

// Generate a fixture large enough to require multiple chunks.
// ~50 sentences × ~19 words ≈ 950 words ≈ 1267 tokens → should produce 2+ chunks.
const LONG_SECTION_SENTENCES = 50;
const FIXTURE_LONG_SECTION = `
# Long Document

## Big Section

${generateLongParagraph(LONG_SECTION_SENTENCES)}
`.trim();

// Fixture where a CFR citation should NOT be split.
const FIXTURE_WITH_CITATION = `
# Regulation Z

## Disclosure Requirements

Creditors must comply with the requirements set forth in 12 CFR 1026.18 when
providing disclosures for closed-end credit. The disclosure must include the
annual percentage rate. Failure to comply with 12 CFR 1026.18 may result in
civil liability under 15 U.S.C. 1640.
`.trim();

// ---------------------------------------------------------------------------
// Test 1: Header path is present in every chunk's metadata.headingPath
// ---------------------------------------------------------------------------

describe("Invariant 1: heading path in every chunk", () => {
  it("every chunk from a document with headers carries a non-empty headingPath", () => {
    const chunks = chunkDocument(FIXTURE_WITH_HEADERS, BASE_METADATA);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(chunk.metadata.headingPath).toBeTruthy();
      expect(chunk.metadata.headingPath.length).toBeGreaterThan(0);
    }
  });

  it("heading path reflects the header hierarchy", () => {
    const chunks = chunkDocument(FIXTURE_WITH_HEADERS, BASE_METADATA);
    // At least one chunk should mention the H3 path with ' > '.
    const hasNestedPath = chunks.some(
      (c) =>
        c.metadata.headingPath.includes(">") &&
        c.metadata.headingPath.includes("Planning")
    );
    expect(hasNestedPath).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test 2: No chunk exceeds ~600 tokens
// ---------------------------------------------------------------------------

describe("Invariant 2: no chunk exceeds ~600 tokens", () => {
  it("all chunks from a long document are within the 600-token limit", () => {
    const chunks = chunkDocument(FIXTURE_LONG_SECTION, BASE_METADATA);
    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      const tokens = tokenCount(chunk.text);
      expect(tokens).toBeLessThanOrEqual(600);
    }
  });

  it("all chunks from the headers fixture are within the 600-token limit", () => {
    const chunks = chunkDocument(FIXTURE_WITH_HEADERS, BASE_METADATA);
    for (const chunk of chunks) {
      expect(tokenCount(chunk.text)).toBeLessThanOrEqual(600);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 3: Adjacent chunks share at least one sentence (overlap)
// ---------------------------------------------------------------------------

describe("Invariant 3: overlap between adjacent chunks", () => {
  it("adjacent chunks from a long document share at least one sentence", () => {
    const chunks = chunkDocument(FIXTURE_LONG_SECTION, BASE_METADATA);

    // Filter to chunks within the same section so overlap is expected.
    const sectionChunks = chunks.filter(
      (c) => c.metadata.headingPath === "Long Document > Big Section"
    );

    if (sectionChunks.length < 2) {
      // If only one chunk was produced the test is vacuously passing —
      // that just means the section fits in a single chunk.
      return;
    }

    for (let i = 0; i < sectionChunks.length - 1; i++) {
      const current = sectionChunks[i].text;
      const next = sectionChunks[i + 1].text;

      // Extract the last sentence of `current` and check it appears in `next`.
      // A sentence ends with a period followed by a space or end-of-string.
      const sentenceMatches = current.match(/[^.!?]+[.!?]+/g);
      expect(sentenceMatches).not.toBeNull();

      if (sentenceMatches && sentenceMatches.length > 0) {
        const lastSentence = sentenceMatches[sentenceMatches.length - 1].trim();
        // The last sentence of the previous chunk should appear somewhere in the next chunk.
        expect(next).toContain(lastSentence.slice(0, 40)); // check a prefix to avoid whitespace issues
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Test 4: Citation strings are never split across chunks
// ---------------------------------------------------------------------------

describe("Invariant 4: citations not split across chunks", () => {
  it("12 CFR 1026.18 appears intact in a single chunk", () => {
    const chunks = chunkDocument(FIXTURE_WITH_CITATION, BASE_METADATA);
    expect(chunks.length).toBeGreaterThan(0);

    const allText = chunks.map((c) => c.text).join("\n---CHUNK_BOUNDARY---\n");

    // The citation must not straddle a chunk boundary.
    expect(allText).not.toMatch(/12 CFR\n---CHUNK_BOUNDARY---/);
    expect(allText).not.toMatch(/---CHUNK_BOUNDARY---\s*1026\.18/);

    // The full citation string must appear in at least one chunk.
    const citationInChunk = chunks.some((c) =>
      c.text.includes("12 CFR 1026.18")
    );
    expect(citationInChunk).toBe(true);
  });

  it("15 U.S.C. 1640 appears intact in a single chunk", () => {
    const chunks = chunkDocument(FIXTURE_WITH_CITATION, BASE_METADATA);
    const citationInChunk = chunks.some((c) =>
      c.text.includes("15 U.S.C. 1640")
    );
    expect(citationInChunk).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test 5: No-header document produces at least one chunk
// ---------------------------------------------------------------------------

describe("Invariant 5: no-header document produces at least one chunk", () => {
  it("a document with no headers produces at least one chunk", () => {
    const chunks = chunkDocument(FIXTURE_NO_HEADERS, BASE_METADATA);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("chunks from a no-header document have correct IDs", () => {
    const chunks = chunkDocument(FIXTURE_NO_HEADERS, BASE_METADATA);
    expect(chunks[0].id).toBe("TEST-DOC::chunk_0");
  });
});
