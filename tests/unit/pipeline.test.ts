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

function makeAnthropicMock(answerText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        id: "msg_test",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: answerText }],
        model: "claude-haiku-4-5-20251001",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// Retrieve node tests
// ---------------------------------------------------------------------------

describe("retrieve node", () => {
  it("maps hits correctly to Retrieval objects", async () => {
    const fakeHits = [
      { _id: "chunk-1", _score: 0.92, fields: { text: "First chunk text." } },
      { _id: "chunk-2", _score: 0.85, fields: { text: "Second chunk text." } },
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
    const anthropic = makeAnthropicMock("The APR must be disclosed. [^1]");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generateNode = createGenerateNode(anthropic as any);
    const state = makeState({ retrievals });

    await generateNode(state);

    const call = anthropic.messages.create.mock.calls[0][0];
    const userContent = call.messages[0].content as string;
    expect(userContent).toContain("Creditors must disclose APR.");
  });

  it("parses citation markers from the answer and builds Citation objects", async () => {
    const retrievals = [
      { chunkId: "chunk-A", text: "First source text.", score: 0.95 },
      { chunkId: "chunk-B", text: "Second source text.", score: 0.88 },
    ];
    const anthropic = makeAnthropicMock("See [^1] and [^2].");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generateNode = createGenerateNode(anthropic as any);
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
    const anthropic = makeAnthropicMock(cannotAnswerText);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generateNode = createGenerateNode(anthropic as any);
    const state = makeState({ retrievals: [] });

    const result = await generateNode(state);

    expect(result.answer).toBe(cannotAnswerText);
    expect(result.citations).toBeUndefined();
  });
});
