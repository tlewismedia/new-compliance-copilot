/**
 * Eval pilot runner.
 *
 * Reads `eval/benchmarks/pilot.yaml`, runs each query through the compiled
 * RAG graph (the same `graph.invoke({ query })` entry point the app uses),
 * and computes pinpoint_precision@5 per item plus the overall mean.
 *
 * Output: a markdown table to stdout AND the same table written to
 * `eval/results/<YYYY-MM-DD>-<short-sha>.md`.
 *
 * Exit code is always 0 — this is a pilot, no regression gating yet.
 *
 * Usage:
 *   pnpm eval
 *
 * Required env (same as the app):
 *   PINECONE_API_KEY, PINECONE_INDEX, OPENAI_API_KEY
 */

import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { execSync } from "child_process";
import { resolve, join } from "path";
import { parse as parseYaml } from "yaml";
import { graph } from "../pipeline/graph";
import type { Retrieval } from "../shared/types";

const TOP_K = 5;

interface BenchmarkItem {
  readonly query: string;
  readonly expected_chunk_ids: readonly string[];
  readonly notes?: string;
}

interface ItemResult {
  readonly query: string;
  readonly expected: readonly string[];
  readonly top5: readonly string[];
  readonly hits: readonly string[];
  readonly precision: number;
  readonly error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shortSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: process.cwd(),
      encoding: "utf8",
    }).trim();
  } catch {
    return "nogit";
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadBenchmark(path: string): BenchmarkItem[] {
  const raw = readFileSync(path, "utf8");
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse YAML at ${path}: ${msg}`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected top-level array in ${path}, got ${typeof parsed}`);
  }
  return parsed.map((item, i): BenchmarkItem => {
    const it = item as Partial<BenchmarkItem> | null;
    if (!it || typeof it.query !== "string" || it.query.trim() === "") {
      throw new Error(`Item ${i}: missing or empty 'query'`);
    }
    if (!Array.isArray(it.expected_chunk_ids) || it.expected_chunk_ids.length === 0) {
      throw new Error(`Item ${i}: 'expected_chunk_ids' must be a non-empty array`);
    }
    return {
      query: it.query,
      expected_chunk_ids: it.expected_chunk_ids.map((c) => String(c)),
      notes: typeof it.notes === "string" ? it.notes : undefined,
    };
  });
}

function precisionAtK(expected: readonly string[], topK: readonly string[]): {
  hits: string[];
  precision: number;
} {
  const expectedSet = new Set(expected);
  const hits = topK.filter((id) => expectedSet.has(id));
  return {
    hits,
    precision: expected.length === 0 ? 0 : hits.length / expected.length,
  };
}

// Markdown cells must not break the table. Pipes get escaped, code fences
// get backticked so multi-ID lists render as one cell.
function mdCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function fmtIds(ids: readonly string[]): string {
  if (ids.length === 0) return "_(none)_";
  return ids.map((id) => "`" + id + "`").join("<br>");
}

function renderTable(results: readonly ItemResult[], mean: number): string {
  const lines: string[] = [];
  lines.push("| # | Query | Expected | Top-5 retrieved | Hit? | Precision |");
  lines.push("|---|-------|----------|-----------------|------|-----------|");
  results.forEach((r, i) => {
    const hitMark = r.error
      ? `error: ${r.error}`
      : r.hits.length > 0
        ? `yes (${r.hits.length}/${r.expected.length})`
        : "no";
    lines.push(
      [
        String(i + 1),
        mdCell(r.query),
        mdCell(fmtIds(r.expected)),
        mdCell(fmtIds(r.top5)),
        mdCell(hitMark),
        r.precision.toFixed(2),
      ].join(" | ")
        .replace(/^/, "| ")
        .replace(/$/, " |")
    );
  });
  lines.push("");
  lines.push(`**pinpoint_precision@${TOP_K} mean: ${mean.toFixed(3)}** across ${results.length} items.`);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const cwd = process.cwd();
  const benchmarkPath = resolve(cwd, "eval/benchmarks/pilot.yaml");
  const items = loadBenchmark(benchmarkPath);

  const results: ItemResult[] = [];

  for (const item of items) {
    process.stderr.write(`[eval] ${item.query.slice(0, 80)}\n`);
    let top5: string[] = [];
    let errorMsg: string | undefined;
    try {
      const state = await graph.invoke({ query: item.query });
      const retrievals: Retrieval[] = state.retrievals ?? [];
      top5 = retrievals.slice(0, TOP_K).map((r) => r.chunkId);
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }

    const { hits, precision } = precisionAtK(item.expected_chunk_ids, top5);
    results.push({
      query: item.query,
      expected: item.expected_chunk_ids,
      top5,
      hits,
      precision: errorMsg ? 0 : precision,
      error: errorMsg,
    });
  }

  const mean =
    results.length === 0
      ? 0
      : results.reduce((s, r) => s + r.precision, 0) / results.length;

  const sha = shortSha();
  const date = todayIso();
  const header = [
    `# Eval pilot — ${date} @ ${sha}`,
    "",
    `Benchmark: \`eval/benchmarks/pilot.yaml\` (${items.length} items)`,
    `Index: \`${process.env["PINECONE_INDEX"] ?? "(unset)"}\``,
    "",
  ].join("\n");
  const table = renderTable(results, mean);
  const fullDoc = `${header}${table}\n`;

  // stdout — the human-readable report.
  process.stdout.write(fullDoc);

  // file — same content, archived under eval/results/.
  const resultsDir = resolve(cwd, "eval/results");
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });
  const outFile = join(resultsDir, `${date}-${sha}.md`);
  writeFileSync(outFile, fullDoc, "utf8");
  process.stderr.write(`[eval] wrote ${outFile}\n`);

  // Always exit 0 — no regression gating in the pilot.
  process.exit(0);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[eval] fatal: ${msg}\n`);
  process.exit(1);
});
