/**
 * Shared eval core.
 *
 * Pure scoring logic extracted from `eval/runner.ts`, reusable by both the
 * CLI runner and the streaming API routes under `app/api/evaluations/`.
 * Adding a new consumer should not duplicate any of the scoring below.
 *
 * Env at runtime: PINECONE_API_KEY, PINECONE_INDEX, OPENAI_API_KEY.
 *                 OPENAI_JUDGE_MODEL overrides the judge model.
 */

import { readFileSync } from "fs";
import yaml from "js-yaml";
import { z } from "zod";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { Pinecone } from "@pinecone-database/pinecone";

export const RETRIEVAL_K = 10;
export const JUDGE_MODEL =
  process.env["OPENAI_JUDGE_MODEL"] ?? "gpt-4.1-nano";

export interface BenchmarkItem {
  query: string;
  category: string;
  expected_chunk_ids: string[];
  keywords: string[];
  reference_answer: string;
  notes?: string;
}

export interface EvalChunk {
  chunkId: string;
  text: string;
}

export interface JudgeResult {
  accuracy: number;
  completeness: number;
  relevance: number;
  feedback: string;
}

export interface RetrievalItemResult {
  query: string;
  category: string;
  pinpointPrecision: number;
  mrr: number;
  ndcg: number;
  keywordCoverage: number;
}

export interface AnswerItemResult {
  query: string;
  category: string;
  answer: string;
  judge: JudgeResult;
}

// ---------------------------------------------------------------------------
// Benchmark loading
// ---------------------------------------------------------------------------

export function loadBenchmark(path: string): BenchmarkItem[] {
  const parsed = yaml.load(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`${path} must be a YAML list`);
  }
  return parsed as BenchmarkItem[];
}

// ---------------------------------------------------------------------------
// Retrieval (direct Pinecone call, separate from the graph's top-5)
// ---------------------------------------------------------------------------

export async function retrieveForEval(
  index: ReturnType<Pinecone["index"]>,
  query: string,
  k: number,
): Promise<EvalChunk[]> {
  const response = await index.searchRecords({
    query: { topK: k, inputs: { text: query } },
  });
  return response.result.hits.map((hit) => {
    const f = hit.fields as Record<string, unknown>;
    return {
      chunkId: hit._id,
      text: String(f["chunk_text"] ?? ""),
    };
  });
}

// ---------------------------------------------------------------------------
// Retrieval metrics
// ---------------------------------------------------------------------------

export function mrrForKeyword(keyword: string, chunks: EvalChunk[]): number {
  const kw = keyword.toLowerCase();
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].text.toLowerCase().includes(kw)) return 1 / (i + 1);
  }
  return 0;
}

export function ndcgForKeyword(
  keyword: string,
  chunks: EvalChunk[],
  k: number,
): number {
  const kw = keyword.toLowerCase();
  const rels: number[] = chunks
    .slice(0, k)
    .map((c) => (c.text.toLowerCase().includes(kw) ? 1 : 0));
  const dcg = rels.reduce<number>((s, r, i) => s + r / Math.log2(i + 2), 0);
  const ideal = [...rels].sort((a, b) => b - a);
  const idcg = ideal.reduce<number>(
    (s, r, i) => s + r / Math.log2(i + 2),
    0,
  );
  return idcg > 0 ? dcg / idcg : 0;
}

export function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((s, x) => s + x, 0) / xs.length;
}

// ---------------------------------------------------------------------------
// Per-item scoring
// ---------------------------------------------------------------------------

export interface PinpointResult {
  pinpointPrecision: number;
  topFiveIds: string[];
}

/**
 * Compute pinpoint precision@5 from the production retrievals (top-5 via the
 * compiled graph). Strict chunk-ID match.
 */
export function scorePinpoint(
  topFiveIds: string[],
  expectedChunkIds: string[],
): PinpointResult {
  const expectedSet = new Set(expectedChunkIds);
  const pinpointHits = topFiveIds.filter((id) => expectedSet.has(id)).length;
  const denom = Math.max(1, expectedChunkIds.length);
  return {
    pinpointPrecision: pinpointHits / denom,
    topFiveIds,
  };
}

export interface KeywordMetrics {
  mrr: number;
  ndcg: number;
  keywordCoverage: number;
}

/**
 * Average MRR, nDCG, and coverage of the benchmark keywords across the
 * provided top-K chunks.
 */
export function scoreKeywordMetrics(
  keywords: string[],
  chunks: EvalChunk[],
  k: number,
): KeywordMetrics {
  const mrrScores = keywords.map((kw) => mrrForKeyword(kw, chunks));
  const ndcgScores = keywords.map((kw) => ndcgForKeyword(kw, chunks, k));
  const mrr = mean(mrrScores);
  const ndcg = mean(ndcgScores);
  const kwFound = mrrScores.filter((s) => s > 0).length;
  const keywordCoverage =
    keywords.length === 0 ? 0 : kwFound / keywords.length;
  return { mrr, ndcg, keywordCoverage };
}

// ---------------------------------------------------------------------------
// LLM-as-judge
// ---------------------------------------------------------------------------

export const AnswerEvalSchema = z.object({
  feedback: z
    .string()
    .describe(
      "Concise feedback on the answer quality, comparing it to the reference answer and evaluating based on the retrieved context.",
    ),
  accuracy: z
    .number()
    .describe(
      "How factually correct is the answer compared to the reference answer? 1 (wrong — any wrong answer must score 1) to 5 (perfectly accurate). An acceptable answer would score 3.",
    ),
  completeness: z
    .number()
    .describe(
      "How complete is the answer in addressing all aspects of the question? 1 (missing key information) to 5 (all information from the reference answer is included). Only give 5 if ALL reference-answer information is covered.",
    ),
  relevance: z
    .number()
    .describe(
      "How relevant is the answer to the specific question asked? 1 (off-topic) to 5 (directly addresses the question with no additional information). Only give 5 if the answer is completely on-point.",
    ),
});

export async function judgeAnswer(
  client: OpenAI,
  item: BenchmarkItem,
  generatedAnswer: string,
): Promise<JudgeResult> {
  const response = await client.chat.completions.parse({
    model: JUDGE_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an expert evaluator assessing the quality of answers. Evaluate the generated answer by comparing it to the reference answer. Only give 5/5 scores for perfect answers.",
      },
      {
        role: "user",
        content: `Question:
${item.query}

Generated Answer:
${generatedAnswer}

Reference Answer:
${item.reference_answer}

Please evaluate the generated answer on three dimensions:
1. Accuracy: How factually correct is it compared to the reference answer? If the answer is wrong, accuracy MUST be 1. Only give 5/5 for perfect answers.
2. Completeness: How thoroughly does it address all aspects of the question, covering all the information from the reference answer?
3. Relevance: How well does it directly answer the specific question asked, giving no additional information?

Provide concise feedback and scores from 1 (very poor) to 5 (ideal) for each dimension.`,
      },
    ],
    response_format: zodResponseFormat(AnswerEvalSchema, "answer_eval"),
  });
  const parsed = response.choices[0].message.parsed;
  if (!parsed) throw new Error("judge returned null parsed response");
  return parsed;
}

// ---------------------------------------------------------------------------
// Client factories
// ---------------------------------------------------------------------------

export function createPineconeIndex(): ReturnType<Pinecone["index"]> {
  const apiKey = process.env["PINECONE_API_KEY"];
  const indexName = process.env["PINECONE_INDEX"];
  if (!apiKey || !indexName) {
    throw new Error(
      "PINECONE_API_KEY and PINECONE_INDEX must be set to run evaluations.",
    );
  }
  return new Pinecone({ apiKey }).index(indexName);
}

export function createOpenAI(): OpenAI {
  return new OpenAI();
}
