import { NextResponse } from "next/server";
import { resolve } from "path";
import {
  RETRIEVAL_K,
  createPineconeIndex,
  loadBenchmark,
  retrieveForEval,
  scoreKeywordMetrics,
  scorePinpoint,
} from "../../../../eval/core";

export const runtime = "nodejs";
// Streaming responses need a generous budget; 5 min matches the answer eval.
export const maxDuration = 300;

/**
 * Streams NDJSON results for retrieval evaluation.
 *
 * Each completed benchmark item is streamed as one JSON line:
 *   { index, total, query, category, pinpointPrecision, mrr, ndcg,
 *     keywordCoverage }
 *
 * A final line with { done: true, summary: {...} } is emitted once all items
 * finish. Client parses lines with response.body.getReader() as they arrive.
 */
export async function POST(): Promise<Response> {
  let items;
  let pineconeIndex;
  try {
    const benchmarkPath = resolve(
      process.cwd(),
      "eval/benchmarks/pilot.yaml",
    );
    items = loadBenchmark(benchmarkPath);
    pineconeIndex = createPineconeIndex();
  } catch (err) {
    console.error("[api/evaluations/retrieval] setup error:", err);
    return NextResponse.json(
      { error: "Failed to initialise evaluation" },
      { status: 500 },
    );
  }

  const encoder = new TextEncoder();
  const total = items.length;
  const loadedItems = items;
  const index = pineconeIndex;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };

      const perItem: Array<{
        category: string;
        mrr: number;
        ndcg: number;
        keywordCoverage: number;
        pinpointPrecision: number;
      }> = [];

      try {
        // Fire all Pinecone queries in parallel and stream each item's
        // metrics as soon as its query resolves. Scoring is pure JS, so
        // the only wait per item is the network round-trip — running them
        // concurrently cuts total time from ~15s to ~1s for 30 items.
        await Promise.all(
          loadedItems.map(async (item, i) => {
            const topK = await retrieveForEval(index, item.query, RETRIEVAL_K);
            const topFiveIds = topK.slice(0, 5).map((c) => c.chunkId);
            const { pinpointPrecision } = scorePinpoint(
              topFiveIds,
              item.expected_chunk_ids,
            );
            const { mrr, ndcg, keywordCoverage } = scoreKeywordMetrics(
              item.keywords,
              topK,
              RETRIEVAL_K,
            );

            perItem.push({
              category: item.category,
              mrr,
              ndcg,
              keywordCoverage,
              pinpointPrecision,
            });

            write({
              index: i + 1,
              total,
              query: item.query,
              category: item.category,
              pinpointPrecision,
              mrr,
              ndcg,
              keywordCoverage,
            });
          }),
        );

        const avg = (xs: number[]) =>
          xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
        const mrrAvg = avg(perItem.map((p) => p.mrr));
        const ndcgAvg = avg(perItem.map((p) => p.ndcg));
        const covAvg = avg(perItem.map((p) => p.keywordCoverage));
        const pinAvg = avg(perItem.map((p) => p.pinpointPrecision));

        const byCategory = new Map<string, number[]>();
        for (const p of perItem) {
          const arr = byCategory.get(p.category) ?? [];
          arr.push(p.mrr);
          byCategory.set(p.category, arr);
        }
        const categories = Array.from(byCategory.entries()).map(
          ([category, mrrs]) => ({
            category,
            avgMrr: avg(mrrs),
            count: mrrs.length,
          }),
        );

        write({
          done: true,
          summary: {
            total,
            mrr: mrrAvg,
            ndcg: ndcgAvg,
            keywordCoverage: covAvg,
            pinpointPrecision: pinAvg,
            categories,
          },
        });
      } catch (err) {
        console.error("[api/evaluations/retrieval] error:", err);
        write({
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}
