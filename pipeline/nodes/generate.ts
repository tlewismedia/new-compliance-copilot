import Anthropic from "@anthropic-ai/sdk";
import type { GraphState } from "../state";
import type { Citation } from "../../shared/types";

const SYSTEM_PROMPT = `You are a compliance assistant. Answer questions using ONLY the provided source chunks below.
Use inline citation markers like [^1], [^2], etc. to reference specific chunks when making claims.
If the provided chunks are empty or do not contain sufficient information to answer the question,
respond with exactly: "I cannot answer from the available sources."
Never fabricate information or cite sources not provided to you.`;

function formatContext(state: GraphState): string {
  if (state.retrievals.length === 0) {
    return "(No source chunks available.)";
  }
  return state.retrievals
    .map((r, i) => `[^${i + 1}] ${r.text}`)
    .join("\n\n");
}

function parseCitations(answer: string, state: GraphState): Citation[] {
  const markers = new Set<number>();
  const regex = /\[\^(\d+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(answer)) !== null) {
    const n = parseInt(match[1], 10);
    if (n >= 1 && n <= state.retrievals.length) {
      markers.add(n);
    }
  }

  return Array.from(markers)
    .sort((a, b) => a - b)
    .map((n) => ({
      chunkId: state.retrievals[n - 1].chunkId,
      marker: `[^${n}]`,
    }));
}

export function createGenerateNode(anthropic: Anthropic) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    const context = formatContext(state);
    const userContent = `Source chunks:\n\n${context}\n\nQuestion: ${state.query}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const answer = textBlock && textBlock.type === "text" ? textBlock.text : "";

    const citations = parseCitations(answer, state);

    return {
      answer,
      citations: citations.length > 0 ? citations : undefined,
    };
  };
}
