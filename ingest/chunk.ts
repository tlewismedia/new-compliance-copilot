/**
 * Markdown-aware chunker with regulatory paragraph-path awareness.
 *
 * Two modes, dispatched on the front-matter `authority`:
 *
 *  - **Regulatory mode** (`authority ∈ {SEC, FINRA, MSRB}`): the chunker
 *    recognises paragraph markers in the body — (a), (1), (i) for CFR-style
 *    regulations and .01-.99 for FINRA Supplementary Material — and emits
 *    one chunk per terminal paragraph. Chunk IDs are
 *    `${citationId}::${paragraphPath}::p${N}`. When a frame has no detected
 *    paragraph marker, the ID falls back to the heading-slug form below.
 *
 *  - **Fallback mode** (everything else, including `Kestrel` and `FinCEN`):
 *    the original H1/H2/H3 + sentence-packing logic. Chunk IDs use a
 *    heading-slug suffix: `${citationId}::${slugifyHeadingPath(headingPath)}`.
 *    If a heading scope produces multiple token-cap chunks, appends `::p0`,
 *    `::p1`, etc. Collisions within a doc get `-2`, `-3`, … suffixes.
 *
 * Shared behaviour across modes:
 *  - Target ~500 tokens (~375 words) per chunk, with ~50-token (~38-word)
 *    overlap between adjacent chunks within the same leaf.
 *  - Never split mid-sentence or mid-citation (e.g. `12 CFR 1026.18`).
 *  - Token heuristic: 1 token ≈ 0.75 words.
 */

import type { Chunk, ChunkMetadata } from "../shared/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TARGET_TOKENS = 500;
const OVERLAP_TOKENS = 50;
const WORDS_PER_TOKEN = 0.75;
const TARGET_WORDS = Math.round(TARGET_TOKENS * WORDS_PER_TOKEN); // ~375
const OVERLAP_WORDS = Math.round(OVERLAP_TOKENS * WORDS_PER_TOKEN); // ~38

// Regulatory-mode: a closed paragraph frame whose body has fewer than this
// many words is merged into the immediately-following child frame (i.e. a
// frame one level deeper in the paragraph-marker stack) rather than emitted
// as its own chunk. Frames that are exclusively the residual of a header
// line (heading title stripped of its marker) are dropped entirely — see
// `chunkRegulatory`.
export const SMALL_FRAME_WORDS = 15;

const HEADER_RE = /^(#{1,3})\s+(.+)$/;

// ---------------------------------------------------------------------------
// Sentence-level helpers (shared across modes)
// ---------------------------------------------------------------------------

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ((ch === "." || ch === "!" || ch === "?") && i + 1 < text.length) {
      const next = text[i + 1];
      if (next === " " || next === "\n") {
        const prevChar = i > 0 ? text[i - 1] : "";
        const isCitationDot = /\d/.test(prevChar);
        const isAbbrev = /[A-Z]/.test(prevChar);
        if (!isCitationDot && !isAbbrev) {
          sentences.push(text.slice(start, i + 1).trim());
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

function packSentencesIntoChunks(sentences: string[]): string[] {
  if (sentences.length === 0) return [];

  const chunks: string[] = [];
  let currentSentences: string[] = [];
  let currentWords = 0;

  for (const sentence of sentences) {
    const sw = wordCount(sentence);

    if (currentWords + sw > TARGET_WORDS && currentSentences.length > 0) {
      chunks.push(currentSentences.join(" "));

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
// Heading-slug helper (used by fallback mode)
// ---------------------------------------------------------------------------

/**
 * Convert a heading path like
 *   "Supervision > (c) Internal inspections > (1) Inspection cycles"
 * into a kebab-case slug using charset [a-z0-9.-].
 *
 * Strategy: lowercase, collapse punctuation/whitespace runs into hyphens,
 * strip leading/trailing hyphens, limit run of consecutive hyphens to one.
 */
function slugifyHeadingPath(path: string): string {
  return path
    .toLowerCase()
    // Replace any run of non-alphanumeric, non-dot characters with a hyphen.
    .replace(/[^a-z0-9.]+/g, "-")
    // Collapse multiple consecutive hyphens.
    .replace(/-{2,}/g, "-")
    // Strip leading/trailing hyphens.
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolve a de-duplicated slug for a heading path, mutating the supplied
 * collision map. First use returns the raw slug; subsequent uses append
 * -2, -3, … in emission order. Empty heading paths fall back to "section".
 */
function resolveSlug(
  headingPath: string,
  slugCounts: Map<string, number>
): string {
  const raw =
    headingPath.length > 0 ? slugifyHeadingPath(headingPath) : "section";
  const count = slugCounts.get(raw) ?? 0;
  slugCounts.set(raw, count + 1);
  return count === 0 ? raw : `${raw}-${count + 1}`;
}

// ---------------------------------------------------------------------------
// Fallback mode: H1/H2/H3 + sentence-packing (Kestrel, FinCEN, unknown)
// ---------------------------------------------------------------------------

interface Section {
  headingPath: string;
  body: string;
}

function parseSections(body: string): Section[] {
  const lines = body.split("\n");
  const sections: Section[] = [];
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
      const level = match[1].length;
      const title = match[2].trim();

      headingStack[level - 1] = title;
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

function chunkFallback(
  body: string,
  metadata: Omit<ChunkMetadata, "headingPath" | "chunkIndex" | "paragraphPath">
): Chunk[] {
  const sections = parseSections(body);
  const chunks: Chunk[] = [];
  let globalIndex = 0;

  // Per-doc collision tracking: slug → count of times already used.
  const slugCounts = new Map<string, number>();

  for (const section of sections) {
    if (section.body.trim().length === 0) continue;

    const sentences = splitSentences(section.body);
    const packedChunks = packSentencesIntoChunks(sentences);

    // Resolve the slug once per section (so all chunks in the same heading
    // scope share the same base slug, disambiguated by ::p0, ::p1, …).
    const slug = resolveSlug(section.headingPath, slugCounts);
    const multiChunk = packedChunks.filter((t) => t.trim().length > 0).length > 1;

    let sectionChunkIndex = 0;
    for (const chunkText of packedChunks) {
      if (chunkText.trim().length === 0) continue;

      const chunkMetadata: ChunkMetadata = {
        ...metadata,
        headingPath: section.headingPath,
        paragraphPath: "",
        chunkIndex: globalIndex,
      };

      // Overflow: if the section splits into multiple chunks, append ::p0, ::p1, …
      const id = multiChunk
        ? `${metadata.citationId}::${slug}::p${sectionChunkIndex}`
        : `${metadata.citationId}::${slug}`;

      chunks.push({ id, text: chunkText, metadata: chunkMetadata });

      globalIndex++;
      sectionChunkIndex++;
    }
  }

  if (chunks.length === 0 && body.trim().length > 0) {
    const slug = resolveSlug("", slugCounts);
    const chunkMetadata: ChunkMetadata = {
      ...metadata,
      headingPath: "",
      paragraphPath: "",
      chunkIndex: 0,
    };
    chunks.push({
      id: `${metadata.citationId}::${slug}`,
      text: body.trim(),
      metadata: chunkMetadata,
    });
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Regulatory mode: paragraph-marker detection
// ---------------------------------------------------------------------------

interface ParagraphMarker {
  level: number;
  marker: string;
}

type MarkerMatcher = (
  line: string,
  stack: readonly ParagraphMarker[]
) => ParagraphMarker | null;

// Single-char letters that are also valid Roman numerals (lowercase).
// At the top level of an SEC/MSRB paragraph stack these read as letters
// (e.g. `(i)` as a top-level paragraph). Inside a deeper numbered paragraph
// they read as Roman numerals.
const AMBIGUOUS_ROMAN_LETTER = /^[ivxlc]$/;

// Strip Markdown leaders that commonly precede a paragraph marker: header
// hashes, bullet points, numbered-list leaders, and any trailing whitespace.
function stripLeaders(line: string): string {
  return line.replace(/^(?:#{1,6}\s+|[-*]\s+|\d+\.\s+)/, "").trimStart();
}

// Prefer the Roman-numeral interpretation of an ambiguous single-char
// letter (i, v, x, l, c) when the paragraph stack is already inside a
// numbered sub-paragraph — the CFR convention is (a) → (1) → (i).
function preferRomanHere(stack: readonly ParagraphMarker[]): boolean {
  return stack.some((m) => m.level === 1);
}

function matchSecMarker(
  line: string,
  stack: readonly ParagraphMarker[]
): ParagraphMarker | null {
  const s = stripLeaders(line);

  // Multi-char Roman (ii, iii, iv, vi, ix, …) is unambiguous.
  let m = s.match(/^\(([ivxlc]{2,})\)(?=\s|$|\.)/);
  if (m) return { level: 2, marker: `(${m[1]})` };

  // Single-letter marker: ambiguous iff the letter is itself a valid
  // Roman-numeral symbol. Resolve by stack context.
  m = s.match(/^\(([a-z])\)(?=\s|$|\.)/);
  if (m) {
    const letter = m[1];
    if (AMBIGUOUS_ROMAN_LETTER.test(letter) && preferRomanHere(stack)) {
      return { level: 2, marker: `(${letter})` };
    }
    return { level: 0, marker: `(${letter})` };
  }

  m = s.match(/^\((\d+)\)(?=\s|$|\.)/);
  if (m) return { level: 1, marker: `(${m[1]})` };
  return null;
}

function matchFinraMarker(line: string): ParagraphMarker | null {
  const s = stripLeaders(line);
  const m = s.match(/^\.(\d{2})(?=\s|$)/);
  if (m) return { level: 0, marker: `.${m[1]}` };
  return null;
}

function matchMsrbMarker(
  line: string,
  stack: readonly ParagraphMarker[]
): ParagraphMarker | null {
  const s = stripLeaders(line);

  // Multi-char Roman is unambiguous.
  let m = s.match(/^\(([ivxlc]{2,})\)(?=\s|$|\.)/);
  if (m) return { level: 1, marker: `(${m[1]})` };

  m = s.match(/^\(([a-z])\)(?=\s|$|\.)/);
  if (m) {
    const letter = m[1];
    // MSRB uses two levels: (a) then (i). Inside an (a), ambiguous letters
    // resolve as Roman.
    if (
      AMBIGUOUS_ROMAN_LETTER.test(letter) &&
      stack.some((p) => p.level === 0)
    ) {
      return { level: 1, marker: `(${letter})` };
    }
    return { level: 0, marker: `(${letter})` };
  }
  return null;
}

// Strip a detected paragraph marker from the line's rendered text, keeping
// any prose that follows it on the same line.
function stripDetectedMarker(line: string): string {
  // Strip leading Markdown leader once, then strip the paragraph marker.
  const noLeader = line.replace(/^(?:#{1,6}\s+|[-*]\s+|\d+\.\s+)/, "");
  return noLeader
    .replace(/^\.(\d{2})\s*/, "")
    .replace(/^\(([a-z0-9]+|[ivxlc]+)\)\s*/i, "")
    .trim();
}

interface FrameLine {
  text: string;
  // `true` iff this line was produced by stripping the paragraph marker
  // from a Markdown header line (i.e. the heading's title prose). Frames
  // whose lines are ALL header-residuals contain no real body — they are
  // just a heading title — and are dropped during emission.
  fromHeaderResidual: boolean;
}

interface ParagraphFrame {
  paragraphPath: string; // concatenation of marker stack, e.g. "(a)(2)(ii)"
  headingPath: string;
  lines: FrameLine[];
}

function chunkRegulatory(
  body: string,
  metadata: Omit<ChunkMetadata, "headingPath" | "chunkIndex" | "paragraphPath">,
  matcher: MarkerMatcher
): Chunk[] {
  const lines = body.split("\n");
  const headingStack: string[] = ["", "", ""];
  const markerStack: ParagraphMarker[] = [];
  const frames: ParagraphFrame[] = [];
  let current: ParagraphFrame = {
    paragraphPath: "",
    headingPath: "",
    lines: [],
  };

  function pathFromStack(): string {
    return markerStack.map((m) => m.marker).join("");
  }

  function currentHeadingPath(): string {
    return headingStack.filter((h) => h.length > 0).join(" > ");
  }

  function openFrame(): void {
    current = {
      paragraphPath: pathFromStack(),
      headingPath: currentHeadingPath(),
      lines: [],
    };
  }

  function closeFrame(): void {
    if (current.lines.some((l) => l.text.trim().length > 0)) {
      frames.push(current);
    }
    openFrame();
  }

  for (const line of lines) {
    const hdr = HEADER_RE.exec(line);
    if (hdr) {
      // Always close the current frame on a header boundary.
      closeFrame();

      const level = hdr[1].length;
      headingStack[level - 1] = hdr[2].trim();
      for (let d = level; d < headingStack.length; d++) headingStack[d] = "";

      // Header may itself introduce a paragraph marker.
      const headerMarker = matcher(line, markerStack);
      if (headerMarker) {
        while (
          markerStack.length > 0 &&
          markerStack[markerStack.length - 1].level >= headerMarker.level
        ) {
          markerStack.pop();
        }
        markerStack.push(headerMarker);
      } else {
        // A non-marker header resets the paragraph stack.
        markerStack.length = 0;
      }

      openFrame();

      // If the header introduces a paragraph marker, its trailing prose
      // is the first sentence of that paragraph. Headers without a marker
      // are purely structural — their title is not treated as chunk prose.
      if (headerMarker) {
        const residual = stripDetectedMarker(line);
        if (residual.length > 0) {
          current.lines.push({ text: residual, fromHeaderResidual: true });
        }
      }
      continue;
    }

    const marker = matcher(line, markerStack);
    if (marker) {
      closeFrame();
      while (
        markerStack.length > 0 &&
        markerStack[markerStack.length - 1].level >= marker.level
      ) {
        markerStack.pop();
      }
      markerStack.push(marker);
      openFrame();
      const residual = stripDetectedMarker(line);
      if (residual.length > 0) {
        current.lines.push({ text: residual, fromHeaderResidual: false });
      }
      continue;
    }

    current.lines.push({ text: line, fromHeaderResidual: false });
  }
  closeFrame();

  // -------------------------------------------------------------------
  // Post-process: drop header-residual-only frames, merge small parent
  // frames into the first deeper-level child frame.
  // -------------------------------------------------------------------

  // Step 1 — drop frames whose only content is the residual of a header
  // line (a heading title with its marker stripped and no body prose).
  // These carry no real content and are never useful as retrievals.
  const afterDrop: ParagraphFrame[] = frames.filter((frame) => {
    const nonBlank = frame.lines.filter((l) => l.text.trim().length > 0);
    if (nonBlank.length === 0) return false;
    // Keep the frame iff at least one non-blank line is body prose rather
    // than a header residual.
    return nonBlank.some((l) => !l.fromHeaderResidual);
  });

  // Step 2 — merge small parent frames forward into the next deeper-level
  // child frame. A small frame is one whose body has fewer than
  // SMALL_FRAME_WORDS words. "Deeper-level child" is defined structurally
  // against the paragraph-marker stack: the next frame must have a strictly
  // longer `paragraphPath` that starts with the current frame's path, and
  // the current frame must itself have a non-empty path (otherwise the two
  // frames are independent heading-scoped siblings, not parent/child).
  // If the next frame is a sibling, an ancestor, or a heading-scoped peer,
  // the small frame is emitted as-is — we never merge upward.
  const mergedFrames: ParagraphFrame[] = [];
  for (let i = 0; i < afterDrop.length; i++) {
    const frame = afterDrop[i];
    const frameText = frame.lines.map((l) => l.text).join("\n").trim();
    const frameWords = wordCount(frameText);
    const next = afterDrop[i + 1];

    const isSmall = frameWords > 0 && frameWords < SMALL_FRAME_WORDS;
    const nextIsChild =
      next !== undefined &&
      frame.paragraphPath.length > 0 &&
      next.paragraphPath.length > frame.paragraphPath.length &&
      next.paragraphPath.startsWith(frame.paragraphPath);

    if (isSmall && nextIsChild) {
      // Prepend this frame's text to the next child frame, keeping the
      // child's provenance flags intact. The prepended line is marked as
      // body prose (not header-residual) so it cannot cause the combined
      // frame to be dropped by Step 1 semantics on a later pass.
      next.lines = [
        { text: frameText, fromHeaderResidual: false },
        ...next.lines,
      ];
      continue; // do not emit the small parent frame itself
    }

    mergedFrames.push(frame);
  }

  // Convert frames to chunks. A frame may produce multiple chunks if its
  // prose exceeds the target-token budget; suffix with `p${N}` in order.
  const chunks: Chunk[] = [];
  let globalIndex = 0;

  // Per-doc collision tracking for the heading-slug fallback (used when a
  // frame has no detected paragraph marker — e.g. FINRA rule bodies whose
  // sub-paragraphs aren't .NN-style, or SEC headings like `### (c)(2) ...`
  // where the matcher captures only the first marker on the line).
  const slugCounts = new Map<string, number>();

  // Resolve a slug once per frame so all chunks in the same frame share a
  // base ID, disambiguated by ::p0, ::p1, ….
  const slugByFrame = new Map<ParagraphFrame, string>();
  for (const frame of mergedFrames) {
    if (frame.paragraphPath.length === 0) {
      slugByFrame.set(frame, resolveSlug(frame.headingPath, slugCounts));
    }
  }

  for (const frame of mergedFrames) {
    const text = frame.lines.map((l) => l.text).join("\n").trim();
    if (text.length === 0) continue;

    const sentences = splitSentences(text);
    const packed = packSentencesIntoChunks(sentences);
    const multiChunk = packed.filter((t) => t.trim().length > 0).length > 1;

    for (let i = 0; i < packed.length; i++) {
      const chunkText = packed[i];
      if (chunkText.trim().length === 0) continue;

      const chunkMetadata: ChunkMetadata = {
        ...metadata,
        headingPath: frame.headingPath,
        paragraphPath: frame.paragraphPath,
        chunkIndex: globalIndex,
      };

      let id: string;
      if (frame.paragraphPath.length > 0) {
        id = `${metadata.citationId}::${frame.paragraphPath}::p${i}`;
      } else {
        const slug = slugByFrame.get(frame)!;
        id = multiChunk
          ? `${metadata.citationId}::${slug}::p${i}`
          : `${metadata.citationId}::${slug}`;
      }

      chunks.push({ id, text: chunkText, metadata: chunkMetadata });
      globalIndex++;
    }
  }

  if (chunks.length === 0 && body.trim().length > 0) {
    const slug = resolveSlug("", slugCounts);
    chunks.push({
      id: `${metadata.citationId}::${slug}`,
      text: body.trim(),
      metadata: {
        ...metadata,
        headingPath: "",
        paragraphPath: "",
        chunkIndex: 0,
      },
    });
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function chunkDocument(
  body: string,
  metadata: Omit<ChunkMetadata, "headingPath" | "chunkIndex" | "paragraphPath">
): Chunk[] {
  switch (metadata.authority) {
    case "SEC":
      return chunkRegulatory(body, metadata, matchSecMarker);
    case "FINRA":
      return chunkRegulatory(body, metadata, (line) => matchFinraMarker(line));
    case "MSRB":
      return chunkRegulatory(body, metadata, matchMsrbMarker);
    case "FinCEN":
    case "Kestrel":
    default:
      return chunkFallback(body, metadata);
  }
}
