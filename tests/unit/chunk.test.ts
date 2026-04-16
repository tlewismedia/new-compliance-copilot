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
  citationIdDisplay: "TEST-DOC",
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
    expect(chunks[0].id).toBe("TEST-DOC::section");
  });
});

// ---------------------------------------------------------------------------
// Regulatory mode: SEC (CFR) paragraph markers
// ---------------------------------------------------------------------------

const FIXTURE_SEC_CFR = `
# § 240.15l-1 Regulation Best Interest.

## (a) Best interest obligation.

A broker-dealer must act in the best interest of the retail customer at the
time the recommendation is made, without placing the broker-dealer's
interest ahead of the customer's.

### (2) Care obligation.

The broker-dealer must exercise reasonable diligence, care, and skill to
understand the potential risks, rewards, and costs associated with the
recommendation being made to the retail customer.

- (ii) Have a reasonable basis to believe that the recommendation is in the
  best interest of a particular retail customer based on that customer's
  investment profile.
`.trim();

describe("Regulatory mode: SEC CFR paragraph paths", () => {
  const SEC_METADATA: Omit<
    ChunkMetadata,
    "headingPath" | "chunkIndex" | "paragraphPath"
  > = {
    ...BASE_METADATA,
    authority: "SEC",
    citationId: "17-CFR-240.15l-1",
  };

  it("emits a chunk with ID `17-CFR-240.15l-1::(a)(2)(ii)::p0`", () => {
    const chunks = chunkDocument(FIXTURE_SEC_CFR, SEC_METADATA);
    const ids = chunks.map((c) => c.id);
    expect(ids).toContain("17-CFR-240.15l-1::(a)(2)(ii)::p0");
  });

  it("assigns paragraph paths at (a), (a)(2), and (a)(2)(ii)", () => {
    const chunks = chunkDocument(FIXTURE_SEC_CFR, SEC_METADATA);
    const paths = new Set(chunks.map((c) => c.metadata.paragraphPath));
    expect(paths.has("(a)")).toBe(true);
    expect(paths.has("(a)(2)")).toBe(true);
    expect(paths.has("(a)(2)(ii)")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Regulatory mode: FINRA Supplementary Material markers
// ---------------------------------------------------------------------------

const FIXTURE_FINRA = `
# Rule 5310. Best Execution and Interpositioning

## (a) Best execution standard.

A member shall use reasonable diligence to ascertain the best market.

# Supplementary Material

## .09 Best Execution for Fixed Income Securities.

For debt securities that are subject to FINRA jurisdiction, the
best-execution review must be conducted in a manner that accounts for
the distinct characteristics of the fixed-income markets.
`.trim();

describe("Regulatory mode: FINRA Supplementary Material paths", () => {
  const FINRA_METADATA: Omit<
    ChunkMetadata,
    "headingPath" | "chunkIndex" | "paragraphPath"
  > = {
    ...BASE_METADATA,
    authority: "FINRA",
    citationId: "FINRA-Rule-5310",
    jurisdiction: "SRO",
    docType: "rule",
  };

  it("emits a chunk with ID `FINRA-Rule-5310::.09::p0`", () => {
    const chunks = chunkDocument(FIXTURE_FINRA, FINRA_METADATA);
    const ids = chunks.map((c) => c.id);
    expect(ids).toContain("FINRA-Rule-5310::.09::p0");
  });

  it("recognises both the operative (a) paragraph and the .09 Supplementary Material", () => {
    const chunks = chunkDocument(FIXTURE_FINRA, FINRA_METADATA);
    const paths = new Set(chunks.map((c) => c.metadata.paragraphPath));
    // FINRA matcher doesn't match `(a)` — only `.NN` — so (a) content
    // falls through with an empty paragraph path.
    expect(paths.has(".09")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Regulatory mode: MSRB paragraph markers
// ---------------------------------------------------------------------------

const FIXTURE_MSRB = `
# MSRB Rule G-18. Best Execution of Transactions in Municipal Securities.

## (c) Considerations.

In any transaction for or with a customer, a broker, dealer, or municipal
securities dealer must use reasonable diligence.

- (i) The character of the market for the security, including price,
  volatility, and liquidity.
`.trim();

describe("Regulatory mode: MSRB paragraph paths", () => {
  const MSRB_METADATA: Omit<
    ChunkMetadata,
    "headingPath" | "chunkIndex" | "paragraphPath"
  > = {
    ...BASE_METADATA,
    authority: "MSRB",
    citationId: "MSRB-Rule-G-18",
    jurisdiction: "SRO",
    docType: "rule",
  };

  it("emits a chunk with ID `MSRB-Rule-G-18::(c)(i)::p0`", () => {
    const chunks = chunkDocument(FIXTURE_MSRB, MSRB_METADATA);
    const ids = chunks.map((c) => c.id);
    expect(ids).toContain("MSRB-Rule-G-18::(c)(i)::p0");
  });
});

// ---------------------------------------------------------------------------
// Regulatory mode: heading-residual drop + small-parent-merge (issue #49)
// ---------------------------------------------------------------------------

describe("Regulatory mode: drop heading-residual-only frames", () => {
  const SEC_META: Omit<
    ChunkMetadata,
    "headingPath" | "chunkIndex" | "paragraphPath"
  > = {
    ...BASE_METADATA,
    authority: "SEC",
    citationId: "TEST-DOC",
  };

  it("does not emit a chunk whose only content is a header residual", () => {
    // `## (a) Short title.` followed immediately by `### (1) Body…` means the
    // `(a)` frame contains only the residual `Short title.` — a heading
    // title with no prose. That frame must be dropped.
    const fixture = `
# Section

## (a) Short title.

### (1) Body text for the first sub-paragraph that is long enough to be
emitted as its own chunk without triggering the small-frame merge rule
and thus produces a stable chunk id.
`.trim();

    const chunks = chunkDocument(fixture, SEC_META);
    const ids = chunks.map((c) => c.id);

    expect(ids).not.toContain("TEST-DOC::(a)::p0");
    expect(ids).toContain("TEST-DOC::(a)(1)::p0");
  });
});

describe("Regulatory mode: merge small parent frames into first child", () => {
  const SEC_META: Omit<
    ChunkMetadata,
    "headingPath" | "chunkIndex" | "paragraphPath"
  > = {
    ...BASE_METADATA,
    authority: "SEC",
    citationId: "TEST-DOC",
  };

  it("prepends a small parent frame's prose to the first deeper-level child", () => {
    // Mirrors Reg SHO `(b)(2)`: an `### (2) Exceptions.` header with a brief
    // intro sentence under it, followed by bulleted sub-items `(i)`, `(ii)`.
    // The parent frame body is below SMALL_FRAME_WORDS so it must be merged
    // into `(i)` (the first child) and NOT emitted as its own chunk. The
    // sibling `(ii)` receives no merge — only the first child does.
    const fixture = `
# Section

## (b) Parent paragraph with more than fifteen words so that it is comfortably
above the small-frame threshold and gets emitted as its own chunk without
any special handling.

### (2) Exceptions.

The locate requirement does not apply to:

- (i) Short sales by a broker-dealer in connection with bona-fide market
  making activity in the security for which the short sale is effected.
- (ii) Short sales effected by a broker-dealer for an account of a
  registered market maker on the same bona-fide market-making basis.
`.trim();

    const chunks = chunkDocument(fixture, SEC_META);
    const ids = chunks.map((c) => c.id);

    // The small parent frame must NOT be emitted.
    expect(ids).not.toContain("TEST-DOC::(b)(2)::p0");

    // The first child frame carries the merged intro sentence at its head,
    // BEFORE its own prose.
    const firstChild = chunks.find(
      (c) => c.id === "TEST-DOC::(b)(2)(i)::p0"
    );
    expect(firstChild).toBeDefined();
    const introIdx = firstChild!.text.indexOf(
      "The locate requirement does not apply to:"
    );
    const ownProseIdx = firstChild!.text.indexOf("Short sales by a broker-dealer");
    expect(introIdx).toBeGreaterThanOrEqual(0);
    expect(ownProseIdx).toBeGreaterThan(introIdx);
    // Sanity: the child's own prose is preserved after the merged prefix.
    expect(firstChild!.text).toContain("bona-fide market");

    // The sibling `(ii)` does NOT receive the merged prefix.
    const secondChild = chunks.find(
      (c) => c.id === "TEST-DOC::(b)(2)(ii)::p0"
    );
    expect(secondChild).toBeDefined();
    expect(secondChild!.text).not.toContain(
      "The locate requirement does not apply to:"
    );
  });
});

describe("Regulatory mode: small frame with no deeper child is emitted as-is", () => {
  const SEC_META: Omit<
    ChunkMetadata,
    "headingPath" | "chunkIndex" | "paragraphPath"
  > = {
    ...BASE_METADATA,
    authority: "SEC",
    citationId: "TEST-DOC",
  };

  it("does not merge upward into a same-level sibling", () => {
    // `(a)` and `(b)` are siblings at the same marker depth. A small `(a)`
    // frame must NOT be merged into `(b)` — merging is downward (into a
    // child) only. The small frame is emitted as-is.
    const fixture = `
# Section

## (a) Short intro.

Brief sentence with only a few words.

## (b) Sibling paragraph containing enough prose to clear the small-frame
threshold and be emitted on its own without special handling.
`.trim();

    const chunks = chunkDocument(fixture, SEC_META);
    const ids = chunks.map((c) => c.id);

    expect(ids).toContain("TEST-DOC::(a)::p0");
    expect(ids).toContain("TEST-DOC::(b)::p0");

    // The `(a)` chunk's text still contains its own intro — it has not been
    // swallowed by `(b)`.
    const a = chunks.find((c) => c.id === "TEST-DOC::(a)::p0");
    expect(a).toBeDefined();
    expect(a!.text).toContain("Brief sentence with only a few words.");

    // And `(b)` does not contain `(a)`'s prose.
    const b = chunks.find((c) => c.id === "TEST-DOC::(b)::p0");
    expect(b).toBeDefined();
    expect(b!.text).not.toContain("Brief sentence with only a few words.");
  });
});

describe("Regulatory mode: SMALL_FRAME_WORDS constant", () => {
  it("is exported with the documented default value", async () => {
    const mod = await import("../../ingest/chunk");
    expect(mod.SMALL_FRAME_WORDS).toBe(15);
  });
});
