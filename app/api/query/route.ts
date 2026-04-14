import { NextResponse } from "next/server";
import { graph } from "../../../pipeline/graph";
import type { Citation, Retrieval } from "../../../shared/types";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query =
    body !== null &&
    typeof body === "object" &&
    "query" in body
      ? (body as Record<string, unknown>).query
      : undefined;

  if (typeof query !== "string" || query.trim() === "") {
    return NextResponse.json(
      { error: "Missing or invalid query" },
      { status: 400 },
    );
  }

  let state: { answer?: string; citations?: Citation[]; retrievals?: Retrieval[] };
  try {
    state = await graph.invoke({ query });
  } catch (err) {
    console.error("[api/query] pipeline error:", err);
    return NextResponse.json(
      { error: "Internal pipeline error" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    answer: state.answer ?? "",
    citations: state.citations ?? [],
    retrievals: state.retrievals ?? [],
  });
}
