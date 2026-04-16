import OpenAI from "openai";
import type { GraphState } from "../state";
import type { Citation } from "../../shared/types";
import { logMemory } from "../instrument";

const SYSTEM_PROMPT = `You are a compliance assistant. Answer questions using ONLY the provided source chunks below.
Use inline citation markers like [^1], [^2], etc. to reference specific chunks when making claims.
If the provided chunks are empty or do not contain sufficient information to answer the question,
respond with exactly: "I cannot answer from the available sources."
Never fabricate information or cite sources not provided to you.`;

const MODEL = "gpt-4o-mini";

function formatContext(state: GraphState): string {
  if (state.retrievals.length === 0) {
    return "(No source chunks available.)";
  }
  return state.retrievals
    .map((r, i) => {
      const m = r.metadata;
      const header = m
        ? `[^${i + 1}] ${m.citationIdDisplay} — ${m.title}${m.headingPath ? ` (${m.headingPath})` : ""}`
        : `[^${i + 1}]`;
      return `${header}\n${r.text}`;
    })
    .join("\n\n");
}

function renumberCitations(
  answer: string,
  state: GraphState,
): { answer: string; citations: Citation[] } {
  const regex = /\[\^(\d+)\]/g;
  const orderFirstSeen: number[] = [];
  const remap = new Map<number, number>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(answer)) !== null) {
    const original = parseInt(match[1], 10);
    if (original < 1 || original > state.retrievals.length) continue;
    if (!remap.has(original)) {
      remap.set(original, orderFirstSeen.length + 1);
      orderFirstSeen.push(original);
    }
  }

  const rewritten = answer.replace(/\[\^(\d+)\]/g, (m, raw) => {
    const n = parseInt(raw, 10);
    const mapped = remap.get(n);
    return mapped ? `[^${mapped}]` : m;
  });

  const citations: Citation[] = orderFirstSeen.map((original, i) => ({
    chunkId: state.retrievals[original - 1].chunkId,
    marker: `[^${i + 1}]`,
  }));

  return { answer: rewritten, citations };
}

export function createGenerateNode(openai: OpenAI) {
  return async (state: GraphState): Promise<Partial<GraphState>> => {
    const context = formatContext(state);
    const userContent = `Source chunks:\n\n${context}\n\nQuestion: ${state.query}`;

    const t0 = Date.now();
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });
    const openaiMs = Date.now() - t0;

    const rawAnswer = response.choices[0]?.message?.content ?? "";
    const { answer, citations } = renumberCitations(rawAnswer, state);

    logMemory("generate", {
      promptChars: userContent.length,
      answerChars: answer.length,
      citations: citations.length,
      usage: JSON.stringify(response.usage ?? {}),
      openaiMs,
    });

    return { answer, citations };
  };
}
