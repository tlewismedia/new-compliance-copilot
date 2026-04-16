import { NextResponse } from "next/server";
import { graph } from "../../../pipeline/graph";
import type { QueryResponse } from "../../../shared/types";
import { bumpQuery, logMemory, snapshot } from "../../../pipeline/instrument";

const REQUEST_TIMEOUT_MS = 45_000;

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = (body as { query?: unknown } | null)?.query;
  if (typeof query !== "string" || query.trim() === "") {
    return NextResponse.json(
      { error: "Missing or invalid query" },
      { status: 400 },
    );
  }

  const n = bumpQuery();
  const before = snapshot();
  logMemory(`query:in#${n}`, { chars: query.length });
  const t0 = Date.now();

  try {
    const state = await withTimeout(
      graph.invoke({ query }),
      REQUEST_TIMEOUT_MS,
      `graph.invoke #${n}`,
    );

    const response: QueryResponse = {
      answer: state.answer ?? "",
      citations: state.citations ?? [],
      retrievals: state.retrievals ?? [],
    };

    const totalMs = Date.now() - t0;
    const after = snapshot();
    const deltaMB = Math.round(
      (after.heapUsed - before.heapUsed) / 1024 / 1024,
    );
    logMemory(`query:done#${n}`, {
      ms: totalMs,
      heapDeltaMB: deltaMB,
      retrievals: response.retrievals.length,
      answerChars: response.answer.length,
    });

    // Optional explicit GC nudge — only fires when the dev server was
    // started with `--expose-gc`. Helps us see whether growth is
    // unreclaimable (true leak) vs. just-not-yet-collected.
    const gcFn = (globalThis as { gc?: () => void }).gc;
    if (gcFn) {
      gcFn();
      logMemory(`query:after-gc#${n}`);
    }

    return NextResponse.json(response);
  } catch (err) {
    const totalMs = Date.now() - t0;
    logMemory(`query:err#${n}`, {
      ms: totalMs,
      err: String((err as Error)?.message ?? err).slice(0, 120),
    });
    console.error("[api/query] pipeline error:", err);

    return NextResponse.json(
      { error: "Internal pipeline error" },
      { status: 500 },
    );
  }
}

function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timeout after ${ms}ms: ${label}`)),
      ms,
    );
  });
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
