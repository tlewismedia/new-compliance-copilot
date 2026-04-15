import { describe, it, expect, vi } from "vitest";
import { createRetrieveNode } from "../../pipeline/nodes/retrieve";
import { createGenerateNode } from "../../pipeline/nodes/generate";
import type { GraphState } from "../../pipeline/state";

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

function makeState(overrides: Partial<GraphState> = {}): GraphState {
  return {
    query: "What are the disclosure requirements?",
    retrievals: [],
    answer: undefined,
    citations: undefined,
    ...overrides,
  };
}

function makeVectorStoreMock(hits: object[]) {
  return {
    searchRecords: vi.fn().mockResolvedValue({
      result: { hits },
      usage: { readUnits: 1 },
    }),
  };
}

function makeOpenAIMock(answerText: string) {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          id: "chatcmpl_test",
          object: "chat.completion",
          created: 0,
          model: "gpt-4o-mini",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: answerText },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Retrieve node tests
// ---------------------------------------------------------------------------

describe("retrieve node", () => {
  it("maps hits correctly to Retrieval objects", async () => {
    const fakeHits = [
      { _id: "chunk-1", _score: 0.92, fields: { chunk_text: "First chunk text." } },
      { _id: "chunk-2", _score: 0.85, fields: { chunk_text: "Second chunk text." } },
    ];

    const vectorStore = makeVectorStoreMock(fakeHits);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const retrieveNode = createRetrieveNode(vectorStore as any);
    const state = makeState();

    const result = await retrieveNode(state);

    expect(result.retrievals).toHaveLength(2);
    expect(result.retrievals![0].chunkId).toBe("chunk-1");
    expect(result.retrievals![0].text).toBe("First chunk text.");
    expect(result.retrievals![0].score).toBe(0.92);
    expect(result.retrievals![1].chunkId).toBe("chunk-2");
    expect(result.retrievals![1].text).toBe("Second chunk text.");
    expect(result.retrievals![1].score).toBe(0.85);
  });

  it("returns empty array when no hits are returned", async () => {
    const vectorStore = makeVectorStoreMock([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const retrieveNode = createRetrieveNode(vectorStore as any);
    const state = makeState();

    const result = await retrieveNode(state);

    expect(result.retrievals).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Generate node tests
// ---------------------------------------------------------------------------

describe("generate node", () => {
  it("includes chunk text in the prompt passed to the LLM", async () => {
    const retrievals = [
      { chunkId: "chunk-1", text: "Creditors must disclose APR.", score: 0.9 },
    ];
    const openai = makeOpenAIMock("The APR must be disclosed. [^1]");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generateNode = createGenerateNode(openai as any);
    const state = makeState({ retrievals });

    await generateNode(state);

    const call = openai.chat.completions.create.mock.calls[0][0];
    const userMessage = call.messages.find((m: { role: string }) => m.role === "user");
    expect(userMessage.content).toContain("Creditors must disclose APR.");
  });

  it("parses citation markers from the answer and builds Citation objects", async () => {
    const retrievals = [
      { chunkId: "chunk-A", text: "First source text.", score: 0.95 },
      { chunkId: "chunk-B", text: "Second source text.", score: 0.88 },
    ];
    const openai = makeOpenAIMock("See [^1] and [^2].");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generateNode = createGenerateNode(openai as any);
    const state = makeState({ retrievals });

    const result = await generateNode(state);

    expect(result.citations).toHaveLength(2);
    expect(result.citations![0].chunkId).toBe("chunk-A");
    expect(result.citations![0].marker).toBe("[^1]");
    expect(result.citations![1].chunkId).toBe("chunk-B");
    expect(result.citations![1].marker).toBe("[^2]");
  });

  it("handles empty retrievals gracefully", async () => {
    const cannotAnswerText = "I cannot answer from the available sources.";
    const openai = makeOpenAIMock(cannotAnswerText);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generateNode = createGenerateNode(openai as any);
    const state = makeState({ retrievals: [] });

    const result = await generateNode(state);

    expect(result.answer).toBe(cannotAnswerText);
    expect(result.citations).toEqual([]);
  });
});
