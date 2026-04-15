/**
 * Markdown-aware chunker.
 *
 * Strategy:
 * 1. Split on H1/H2/H3 header boundaries.
 * 2. Carry the full heading path for each section.
 * 3. Pack sub-sections into chunks of ~500 tokens (~375 words) with ~50-token
 *    (~38-word) overlap.
 * 4. Never split mid-citation (e.g. `12 CFR 1026.18`) or mid-sentence.
 * 5. Token heuristic: 1 token ≈ 0.75 words  ↔  N tokens ≈ N * 0.75 words.
 */

import type { Chunk, ChunkMetadata } from "../shared/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TARGET_TOKENS = 500;
const OVERLAP_TOKENS = 50;
// 1 token ≈ 0.75 words  ⟹  word budget = token budget × 0.75
const WORDS_PER_TOKEN = 0.75;
const TARGET_WORDS = Math.round(TARGET_TOKENS * WORDS_PER_TOKEN); // ~375
const OVERLAP_WORDS = Math.round(OVERLAP_TOKENS * WORDS_PER_TOKEN); // ~38

// Regex matching H1 / H2 / H3 lines (including the newline that follows).
const HEADER_RE = /^(#{1,3})\s+(.+)$/m;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rough word count. */
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Split `text` into sentences while preserving citation strings such as
 * `12 CFR 1026.18`.  A citation is any token matching the pattern
 * `NN+ [A-Z]+ NNN+` (e.g. "12 CFR 1026.18", "15 U.S.C. 1601").
 *
 * The split is performed on `. `, `! `, `? ` that are NOT preceded by a
 * citation-like sequence.
 */
function splitSentences(text: string): string[] {
  // We split on sentence-ending punctuation followed by whitespace, but we
  // must not split inside a citation such as "12 CFR 1026.18" or "15 U.S.C."
  // Strategy: walk character-by-character and find safe split points.
  const sentences: string[] = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ((ch === "." || ch === "!" || ch === "?") && i + 1 < text.length) {
      const next = text[i + 1];
      if (next === " " || next === "\n") {
        // Check if this period is part of a citation / abbreviation.
        // Look back for a digit immediately before the dot.
        const prevChar = i > 0 ? text[i - 1] : "";
        const isCitationDot = /\d/.test(prevChar);
        // Also guard abbreviations like "U.S.C." — uppercase letter before dot.
        const isAbbrev = /[A-Z]/.test(prevChar);
        if (!isCitationDot && !isAbbrev) {
          sentences.push(text.slice(start, i + 1).trim());
          // Skip the whitespace(s) after the punctuation.
          while (i + 1 < text.length && /\s/.test(text[i + 1])) i++;
          start = i + 1;
        }
      }
    }
  }
  const tail = text.slice(start).trim();
  if (tail.length > 0) sentences.push(tail);
  return sentences.filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// Section parsing
// ---------------------------------------------------------------------------

interface Section {
  headingPath: string;
  body: string;
}

/**
 * Parse the markdown `body` into sections delimited by H1/H2/H3 headers.
 * Each section carries its full heading path, e.g.
 *   "Domain 5 > Incident Resilience Planning and Strategy > Testing"
 */
function parseSections(body: string): Section[] {
  // Split on lines that start with 1-3 `#` characters.
  const lines = body.split("\n");
  const sections: Section[] = [];

  // Track the heading hierarchy: index 0 = H1, 1 = H2, 2 = H3.
  const headingStack: string[] = ["", "", ""];

  let currentHeadingPath = "";
  let currentBodyLines: string[] = [];

  function flush() {
    const text = currentBodyLines.join("\n").trim();
    if (text.length > 0 || sections.length === 0) {
      sections.push({ headingPath: currentHeadingPath, body: text });
    }
    currentBodyLines = [];
  }

  for (const line of lines) {
    const match = HEADER_RE.exec(line);
    if (match) {
      flush();
      const level = match[1].length; // 1, 2, or 3
      const title = match[2].trim();

      // Update heading stack.
      headingStack[level - 1] = title;
      // Clear deeper levels.
      for (let d = level; d < headingStack.length; d++) {
        headingStack[d] = "";
      }

      currentHeadingPath = headingStack
        .filter((h) => h.length > 0)
        .join(" > ");
    } else {
      currentBodyLines.push(line);
    }
  }
  flush();

  return sections;
}

// ---------------------------------------------------------------------------
// Packing sections into chunks
// ---------------------------------------------------------------------------

/**
 * Given a list of sentences, produce chunks respecting the word budget with
 * overlap.  Never splits mid-sentence.
 */
function packSentencesIntoChunks(sentences: string[]): string[] {
  if (sentences.length === 0) return [];

  const chunks: string[] = [];
  let currentSentences: string[] = [];
  let currentWords = 0;

  for (const sentence of sentences) {
    const sw = wordCount(sentence);

    if (currentWords + sw > TARGET_WORDS && currentSentences.length > 0) {
      // Emit the current chunk.
      chunks.push(currentSentences.join(" "));

      // Build the overlap: keep sentences from the end of the current chunk
      // until we have ~OVERLAP_WORDS worth.
      const overlapSentences: string[] = [];
      let overlapWords = 0;
      for (let i = currentSentences.length - 1; i >= 0; i--) {
        const w = wordCount(currentSentences[i]);
        if (overlapWords + w > OVERLAP_WORDS && overlapSentences.length > 0)
          break;
        overlapSentences.unshift(currentSentences[i]);
        overlapWords += w;
      }
      currentSentences = overlapSentences;
      currentWords = overlapWords;
    }

    currentSentences.push(sentence);
    currentWords += sw;
  }

  if (currentSentences.length > 0) {
    chunks.push(currentSentences.join(" "));
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Chunk a markdown document body into `Chunk[]` records.
 *
 * @param body     - The markdown body (after front-matter has been stripped).
 * @param metadata - The base metadata for this document (from front-matter).
 *                   `headingPath` and `chunkIndex` will be overwritten per chunk.
 */
export function chunkDocument(
  body: string,
  metadata: Omit<ChunkMetadata, "headingPath" | "chunkIndex" | "paragraphPath">
): Chunk[] {
  const sections = parseSections(body);
  const chunks: Chunk[] = [];
  let globalIndex = 0;

  for (const section of sections) {
    if (section.body.trim().length === 0) continue;

    const sentences = splitSentences(section.body);
    const packedChunks = packSentencesIntoChunks(sentences);

    for (const chunkText of packedChunks) {
      if (chunkText.trim().length === 0) continue;

      const chunkMetadata: ChunkMetadata = {
        ...metadata,
        headingPath: section.headingPath,
        paragraphPath: "",
        chunkIndex: globalIndex,
      };

      chunks.push({
        id: `${metadata.citationId}::chunk_${globalIndex}`,
        text: chunkText,
        metadata: chunkMetadata,
      });

      globalIndex++;
    }
  }

  // If nothing was produced (e.g. body had no text in any section), fall back
  // to treating the whole body as one chunk.
  if (chunks.length === 0 && body.trim().length > 0) {
    const chunkMetadata: ChunkMetadata = {
      ...metadata,
      headingPath: "",
      paragraphPath: "",
      chunkIndex: 0,
    };
    chunks.push({
      id: `${metadata.citationId}::chunk_0`,
      text: body.trim(),
      metadata: chunkMetadata,
    });
  }

  return chunks;
}
