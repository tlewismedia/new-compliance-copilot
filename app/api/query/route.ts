import { NextResponse } from "next/server";
import { graph } from "../../../pipeline/graph";
import type { QueryResponse } from "../../../shared/types";

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

  try {
    const state = await graph.invoke({ query });
    const response: QueryResponse = {
      answer: state.answer ?? "",
      citations: state.citations ?? [],
      retrievals: state.retrievals ?? [],
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[api/query] pipeline error:", err);
    
    return NextResponse.json(
      { error: "Internal pipeline error" },
      { status: 500 },
    );
  }
}
