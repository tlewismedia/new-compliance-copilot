/**
 * Server-side corpus loader.
 *
 * Reads the `corpus/*.md` files synchronously and exposes a small typed API
 * that both `/library` and `/library/[slug]` server components consume.
 *
 * Parses front-matter with `gray-matter` (already a dependency for the
 * ingester). Mirrors the ingester's `README.md` / `ARCHITECTURE.md` skip
 * rule. Skips any file missing required v2 front-matter fields rather than
 * throwing — missing metadata should hide a doc from the browse surface but
 * not crash the page.
 */

import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import matter from "gray-matter";

export interface CorpusDoc {
  readonly slug: string;
  readonly title: string;
  readonly authority: string;
  readonly source: string;
  readonly citationIdDisplay: string;
  readonly effectiveDate: string;
  readonly sourceUrl: string;
  readonly docType: string;
  readonly versionStatus: string;
  readonly body: string;
}

const REQUIRED_FIELDS = [
  "title",
  "citation_id_display",
  "authority",
  "source",
  "effective_date",
  "source_url",
] as const;

function corpusDir(): string {
  return resolve(process.cwd(), "corpus");
}

function parseFile(slug: string, filePath: string): CorpusDoc | null {
  const raw = readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);

  for (const field of REQUIRED_FIELDS) {
    if (!data[field]) return null;
  }

  return {
    slug,
    title: String(data["title"]),
    authority: String(data["authority"]),
    source: String(data["source"]),
    citationIdDisplay: String(data["citation_id_display"]),
    effectiveDate: String(data["effective_date"]),
    sourceUrl: String(data["source_url"]),
    docType: String(data["doc_type"] ?? ""),
    versionStatus: String(data["version_status"] ?? "current"),
    body: content,
  };
}

export function loadCorpusDocs(): readonly CorpusDoc[] {
  const dir = corpusDir();
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".md") && f !== "README.md" && f !== "ARCHITECTURE.md",
  );

  const docs: CorpusDoc[] = [];
  for (const fileName of files) {
    const slug = fileName.slice(0, -".md".length);
    const doc = parseFile(slug, join(dir, fileName));
    if (doc) docs.push(doc);
  }

  docs.sort((a, b) =>
    a.title.toLowerCase().localeCompare(b.title.toLowerCase()),
  );
  return docs;
}

export function loadCorpusDoc(slug: string): CorpusDoc | null {
  // Defensive slug validation: slugs must match the kebab-case filenames on
  // disk. Reject anything that could escape the corpus directory.
  if (!/^[a-zA-Z0-9._-]+$/.test(slug)) return null;
  if (slug === "README" || slug === "ARCHITECTURE") return null;

  const filePath = join(corpusDir(), `${slug}.md`);
  try {
    return parseFile(slug, filePath);
  } catch {
    return null;
  }
}
