import { NextResponse } from "next/server";
import { resolve } from "path";
import { graph } from "../../../../pipeline/graph";
import {
  createOpenAI,
  judgeAnswer,
  loadBenchmark,
} from "../../../../eval/core";

export const runtime = "nodejs";
// Judge is a model call per item × 30 items — leave a 5-minute budget and
// rely on NDJSON streaming to keep the connection warm.
export const maxDuration = 300;

/**
 * Streams NDJSON results for answer (LLM-as-judge) evaluation.
 *
 * Each completed benchmark item is streamed as one JSON line:
 *   { index, total, query, category, accuracy, completeness, relevance,
 *     feedback }
 *
 * A final line with { done: true, summary: {...} } is emitted once all items
 * finish. Items where the judge throws are streamed with { error } instead of
 * scores so the UI can still show progress.
 */
export async function POST(): Promise<Response> {
  let items;
  let openai;
  try {
    const benchmarkPath = resolve(
      process.cwd(),
      "eval/benchmarks/pilot.yaml",
    );
    items = loadBenchmark(benchmarkPath);
    openai = createOpenAI();
  } catch (err) {
    console.error("[api/evaluations/answer] setup error:", err);
    return NextResponse.json(
      { error: "Failed to initialise evaluation" },
      { status: 500 },
    );
  }

  const encoder = new TextEncoder();
  const total = items.length;
  const loadedItems = items;
  const client = openai;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };

      const perItem: Array<{
        category: string;
        accuracy: number;
        completeness: number;
        relevance: number;
      }> = [];

      try {
        for (let i = 0; i < loadedItems.length; i++) {
          const item = loadedItems[i];

          // Production answer via compiled graph
          const state = await graph.invoke({ query: item.query });
          const answer = state.answer ?? "";

          try {
            const judge = await judgeAnswer(client, item, answer);
            perItem.push({
              category: item.category,
              accuracy: judge.accuracy,
              completeness: judge.completeness,
              relevance: judge.relevance,
            });
            write({
              index: i + 1,
              total,
              query: item.query,
              category: item.category,
              accuracy: judge.accuracy,
              completeness: judge.completeness,
              relevance: judge.relevance,
              feedback: judge.feedback,
            });
          } catch (err) {
            write({
              index: i + 1,
              total,
              query: item.query,
              category: item.category,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }

        const avg = (xs: number[]) =>
          xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
        const accAvg = avg(perItem.map((p) => p.accuracy));
        const compAvg = avg(perItem.map((p) => p.completeness));
        const relAvg = avg(perItem.map((p) => p.relevance));

        const byCategory = new Map<string, number[]>();
        for (const p of perItem) {
          const arr = byCategory.get(p.category) ?? [];
          arr.push(p.accuracy);
          byCategory.set(p.category, arr);
        }
        const categories = Array.from(byCategory.entries()).map(
          ([category, accs]) => ({
            category,
            avgAccuracy: avg(accs),
            count: accs.length,
          }),
        );

        write({
          done: true,
          summary: {
            total,
            accuracy: accAvg,
            completeness: compAvg,
            relevance: relAvg,
            categories,
          },
        });
      } catch (err) {
        console.error("[api/evaluations/answer] error:", err);
        write({ error: err instanceof Error ? err.message : String(err) });
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
