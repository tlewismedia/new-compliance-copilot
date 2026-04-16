/**
 * Pilot eval runner.
 *
 * For each benchmark item, runs the compiled graph to get an answer and the
 * top-5 retrievals (production retrieval), and separately retrieves top-10
 * chunks for keyword-based retrieval metrics. Scores five things per item:
 *
 *   Retrieval metrics
 *     - pinpoint_precision@5 : fraction of expected_chunk_ids in top-5 (strict
 *                              chunk-ID match; catches retrieval regressions).
 *     - mrr                  : mean reciprocal rank of each keyword in the
 *                              top-10 chunk text (first hit only).
 *     - ndcg                 : nDCG of each keyword with binary relevance.
 *     - keyword_coverage     : fraction of keywords found anywhere in top-10.
 *
 *   Answer metric (LLM-as-judge, skippable)
 *     - judge_accuracy / completeness / relevance (1-5 each) + feedback.
 *
 * Writes a markdown report to stdout and to eval/results/<date>-<sha>.md.
 *
 * Usage:
 *   pnpm eval                                   # full run
 *   pnpm eval --skip-judge                      # retrieval metrics only
 *   pnpm eval eval/benchmarks/pilot.yaml        # explicit path
 *
 * Env: PINECONE_API_KEY, PINECONE_INDEX, OPENAI_API_KEY required.
 *      OPENAI_JUDGE_MODEL overrides the judge model (default: gpt-4.1-nano).
 *
 * Scoring logic lives in `eval/core.ts` so it's reusable by the API routes
 * that back `/evaluations`. This file handles CLI orchestration + reporting.
 */

import "dotenv/config";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { execSync } from "child_process";
import { graph } from "../pipeline/graph";
import {
  JUDGE_MODEL,
  RETRIEVAL_K,
  createOpenAI,
  createPineconeIndex,
  judgeAnswer,
  loadBenchmark,
  mean,
  retrieveForEval,
  scoreKeywordMetrics,
  scorePinpoint,
  type JudgeResult,
} from "./core";

interface ItemResult {
  query: string;
  category: string;
  pinpointPrecision: number;
  mrr: number;
  ndcg: number;
  keywordCoverage: number;
  judge?: JudgeResult;
  answer: string;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function gitShortSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "nogit";
  }
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmt(n: number, digits = 2): string {
  return n.toFixed(digits);
}

function fmtPct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

function buildReport(results: ItemResult[], skipJudge: boolean): string {
  const lines: string[] = [];
  const sha = gitShortSha();
  const date = isoDate();
  lines.push(`# Eval pilot — ${date} (${sha})`);
  lines.push("");

  // Summary
  lines.push("## Summary");
  lines.push("");
  const avgPinpoint = mean(results.map((r) => r.pinpointPrecision));
  const avgMrr = mean(results.map((r) => r.mrr));
  const avgNdcg = mean(results.map((r) => r.ndcg));
  const avgCov = mean(results.map((r) => r.keywordCoverage));
  lines.push(`- **pinpoint_precision@5**: ${fmt(avgPinpoint, 3)}`);
  lines.push(`- **MRR** (k=${RETRIEVAL_K}): ${fmt(avgMrr, 3)}`);
  lines.push(`- **nDCG** (k=${RETRIEVAL_K}): ${fmt(avgNdcg, 3)}`);
  lines.push(`- **keyword_coverage**: ${fmtPct(avgCov)}`);
  if (!skipJudge) {
    const judged = results.filter((r) => r.judge).map((r) => r.judge!);
    const avgAcc = mean(judged.map((j) => j.accuracy));
    const avgComp = mean(judged.map((j) => j.completeness));
    const avgRel = mean(judged.map((j) => j.relevance));
    lines.push(`- **judge_accuracy** (1–5): ${fmt(avgAcc)}`);
    lines.push(`- **judge_completeness** (1–5): ${fmt(avgComp)}`);
    lines.push(`- **judge_relevance** (1–5): ${fmt(avgRel)}`);
    lines.push(`- judge model: \`${JUDGE_MODEL}\``);
  }
  lines.push("");

  // Per-category
  const categories = Array.from(new Set(results.map((r) => r.category)));
  lines.push("## By category");
  lines.push("");
  const catCols = skipJudge
    ? "| category | n | pin@5 | MRR | nDCG | kw% |"
    : "| category | n | pin@5 | MRR | nDCG | kw% | acc | comp | rel |";
  const catSep = skipJudge
    ? "|---|---|---|---|---|---|"
    : "|---|---|---|---|---|---|---|---|---|";
  lines.push(catCols);
  lines.push(catSep);
  for (const cat of categories) {
    const rs = results.filter((r) => r.category === cat);
    const cols = [
      cat,
      String(rs.length),
      fmt(mean(rs.map((r) => r.pinpointPrecision)), 2),
      fmt(mean(rs.map((r) => r.mrr)), 2),
      fmt(mean(rs.map((r) => r.ndcg)), 2),
      fmtPct(mean(rs.map((r) => r.keywordCoverage))),
    ];
    if (!skipJudge) {
      const js = rs.filter((r) => r.judge).map((r) => r.judge!);
      cols.push(fmt(mean(js.map((j) => j.accuracy))));
      cols.push(fmt(mean(js.map((j) => j.completeness))));
      cols.push(fmt(mean(js.map((j) => j.relevance))));
    }
    lines.push(`| ${cols.join(" | ")} |`);
  }
  lines.push("");

  // Per-item
  lines.push("## Per item");
  lines.push("");
  const itemCols = skipJudge
    ? "| # | query | cat | pin@5 | MRR | nDCG | kw% |"
    : "| # | query | cat | pin@5 | MRR | nDCG | kw% | acc | comp | rel |";
  const itemSep = skipJudge
    ? "|---|---|---|---|---|---|---|"
    : "|---|---|---|---|---|---|---|---|---|---|";
  lines.push(itemCols);
  lines.push(itemSep);
  for (const [i, r] of results.entries()) {
    const q =
      r.query.length > 60 ? r.query.slice(0, 57) + "…" : r.query;
    const cols = [
      String(i + 1),
      q,
      r.category,
      fmt(r.pinpointPrecision, 2),
      fmt(r.mrr, 2),
      fmt(r.ndcg, 2),
      fmtPct(r.keywordCoverage),
    ];
    if (!skipJudge && r.judge) {
      cols.push(fmt(r.judge.accuracy));
      cols.push(fmt(r.judge.completeness));
      cols.push(fmt(r.judge.relevance));
    } else if (!skipJudge) {
      cols.push("—", "—", "—");
    }
    lines.push(`| ${cols.join(" | ")} |`);
  }
  lines.push("");

  // Glossary
  lines.push("## What the metrics mean");
  lines.push("");
  lines.push(
    "Each question goes through two stages: the system **retrieves** source passages, then a model **generates** an answer from them. The retrieval metrics score the first stage; the judge metrics score the second.",
  );
  lines.push("");
  lines.push("### Retrieval metrics");
  lines.push("");
  lines.push(
    "**pinpoint_precision@5** (0 to 1) — Did the system pull back the exact chunks we labelled as the \"right answer\"? We look at the top 5 results and count how many expected chunks appear. 1.0 means all of them made the top 5; 0.0 means none did. This is the strictest measure — it rewards an exact chunk match, not \"close enough.\"",
  );
  lines.push("");
  lines.push(
    "**MRR** — Mean Reciprocal Rank (0 to 1). For each keyword from the source passage, how high up the result list did it first appear? A keyword in the first result scores 1.0; in the second, 0.5; in the third, 0.33; and so on. We average across all keywords. Higher is better — it means relevant content is near the top, where the answer generator is most likely to use it.",
  );
  lines.push("");
  lines.push(
    "**nDCG** — Normalized Discounted Cumulative Gain (0 to 1). Similar in spirit to MRR, but rewards having relevant chunks appear anywhere in the top results with extra weight on higher positions. 1.0 means the ideal ranking — every chunk containing the keyword is stacked at the top. Complements MRR when the same keyword appears in several chunks.",
  );
  lines.push("");
  lines.push(
    "**keyword_coverage** (0% to 100%) — Of the keywords we listed as terms a correct answer should convey, what fraction was found *somewhere* in the top 10 retrieved chunks? 100% means every keyword was available for the model to cite. If a keyword is missing from retrieval entirely, the model can't include it in the answer. Blunter than MRR/nDCG: it only cares about presence, not ranking.",
  );
  lines.push("");
  if (!skipJudge) {
    lines.push("### Answer metrics (LLM-as-judge)");
    lines.push("");
    lines.push(
      `A cheap, fast language model (here: \`${JUDGE_MODEL}\`) reads the generated answer alongside our hand-written reference answer and scores three dimensions from 1 (very poor) to 5 (perfect). The judge is instructed that 5 is reserved for perfect answers.`,
    );
    lines.push("");
    lines.push(
      "**judge_accuracy** (1 to 5) — Is the answer *factually correct* compared to the reference? 1 = wrong (any factual error forces a 1). 3 = acceptable. 5 = perfectly accurate.",
    );
    lines.push("");
    lines.push(
      "**judge_completeness** (1 to 5) — Does the answer cover *everything* the reference answer covers? 1 = key information is missing. 5 is only awarded when every point from the reference is present.",
    );
    lines.push("");
    lines.push(
      "**judge_relevance** (1 to 5) — Does the answer stay *on-topic*? 1 = off-topic or padded with irrelevant material. 5 = directly addresses the specific question without extras.",
    );
    lines.push("");
  }
  lines.push("### How to read the results");
  lines.push("");
  lines.push(
    "The metrics are designed to surface *different kinds* of failures. A high pinpoint_precision but low judge_accuracy means retrieval worked but the model misread the source. A low keyword_coverage with a high judge score means the model is correct in spite of weak retrieval. Watch the combinations, not any single number.",
  );
  lines.push("");

  // Low-score feedback details
  if (!skipJudge) {
    const lowScorers = results
      .map((r, i) => ({ r, i }))
      .filter(
        ({ r }) =>
          r.judge &&
          (r.judge.accuracy < 3 ||
            r.judge.completeness < 3 ||
            r.judge.relevance < 3),
      );
    if (lowScorers.length > 0) {
      lines.push("## Judge feedback — items scoring <3 on any dimension");
      lines.push("");
      for (const { r, i } of lowScorers) {
        const j = r.judge!;
        lines.push(
          `**#${i + 1}** (${r.category}) — acc ${fmt(j.accuracy)} / comp ${fmt(j.completeness)} / rel ${fmt(j.relevance)}`,
        );
        lines.push("");
        lines.push(`> ${r.query}`);
        lines.push("");
        lines.push(j.feedback);
        lines.push("");
      }
    }
  }

  return lines.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const skipJudge = process.argv.includes("--skip-judge");
  const benchmarkPath = resolve(
    process.cwd(),
    args[0] ?? "eval/benchmarks/pilot.yaml",
  );

  const items = loadBenchmark(benchmarkPath);
  console.log(
    `Running ${items.length} items from ${benchmarkPath}` +
      (skipJudge ? " (skipping judge)" : ` (judge: ${JUDGE_MODEL})`),
  );
  console.log();

  const pineconeIndex = createPineconeIndex();
  const openai = createOpenAI();

  const results: ItemResult[] = [];

  for (const [i, item] of items.entries()) {
    process.stdout.write(
      `[${i + 1}/${items.length}] ${item.query.slice(0, 60)}… `,
    );

    // Production retrieval + answer via the compiled graph (top-5)
    const state = await graph.invoke({ query: item.query });
    const topFiveIds = (state.retrievals ?? []).map((r) => r.chunkId);
    const { pinpointPrecision } = scorePinpoint(
      topFiveIds,
      item.expected_chunk_ids,
    );

    // Separate top-10 retrieval for keyword-based retrieval metrics
    const topTen = await retrieveForEval(
      pineconeIndex,
      item.query,
      RETRIEVAL_K,
    );
    const { mrr, ndcg, keywordCoverage } = scoreKeywordMetrics(
      item.keywords,
      topTen,
      RETRIEVAL_K,
    );

    // LLM judge
    const answer = state.answer ?? "";
    let judge: JudgeResult | undefined;
    if (!skipJudge) {
      try {
        judge = await judgeAnswer(openai, item, answer);
      } catch (err) {
        console.log();
        console.error(
          `  judge error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    results.push({
      query: item.query,
      category: item.category,
      pinpointPrecision,
      mrr,
      ndcg,
      keywordCoverage,
      judge,
      answer,
    });

    const summary = skipJudge
      ? `pin ${fmt(pinpointPrecision, 2)} · mrr ${fmt(mrr, 2)} · ndcg ${fmt(ndcg, 2)} · kw ${fmtPct(keywordCoverage)}`
      : judge
        ? `pin ${fmt(pinpointPrecision, 2)} · kw ${fmtPct(keywordCoverage)} · acc/comp/rel ${fmt(judge.accuracy)}/${fmt(judge.completeness)}/${fmt(judge.relevance)}`
        : `pin ${fmt(pinpointPrecision, 2)} · kw ${fmtPct(keywordCoverage)} · judge=err`;
    console.log(summary);
  }

  const report = buildReport(results, skipJudge);
  console.log();
  console.log(report);

  const outPath = resolve(
    process.cwd(),
    `eval/results/${isoDate()}-${gitShortSha()}.md`,
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, report);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
