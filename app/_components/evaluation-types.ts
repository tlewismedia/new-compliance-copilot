/**
 * Types shared between the streaming evaluation API routes and the
 * /evaluations dashboard UI. Backed by `eval/core.ts` scoring.
 */

export type ThresholdTier = "green" | "amber" | "red";

export interface RetrievalCategorySummary {
  readonly category: string;
  readonly avgMrr: number;
  readonly count: number;
}

export interface RetrievalSummary {
  readonly total: number;
  readonly mrr: number;
  readonly ndcg: number;
  readonly keywordCoverage: number;
  readonly pinpointPrecision: number;
  readonly categories: readonly RetrievalCategorySummary[];
}

export interface RetrievalStreamItem {
  readonly index: number;
  readonly total: number;
  readonly query: string;
  readonly category: string;
  readonly pinpointPrecision: number;
  readonly mrr: number;
  readonly ndcg: number;
  readonly keywordCoverage: number;
}

export interface AnswerCategorySummary {
  readonly category: string;
  readonly avgAccuracy: number;
  readonly count: number;
}

export interface AnswerSummary {
  readonly total: number;
  readonly accuracy: number;
  readonly completeness: number;
  readonly relevance: number;
  readonly categories: readonly AnswerCategorySummary[];
}

export interface AnswerStreamItem {
  readonly index: number;
  readonly total: number;
  readonly query: string;
  readonly category: string;
  readonly accuracy?: number;
  readonly completeness?: number;
  readonly relevance?: number;
  readonly feedback?: string;
  readonly error?: string;
}

// ── saved reports (persisted to eval/saved-reports/) ────────────────────────

/**
 * Metadata for a saved report — what the list endpoint and the report
 * selector dropdown need to render an option without loading the full
 * summary data.
 */
export interface SavedReportMeta {
  readonly id: string;
  readonly savedAt: string;
}

/**
 * Full persisted report payload. Either `retrieval` or `answer` may be
 * null if the user only ran one section before saving, but not both.
 */
export interface SavedReport extends SavedReportMeta {
  readonly retrieval: RetrievalSummary | null;
  readonly answer: AnswerSummary | null;
}

/**
 * What the `/evaluations` page renders, after reconciling the live session
 * state against any currently-selected saved report.
 *
 *   - `selectedId === ""`  → no saved report is currently selected; render
 *                            the live session state (whatever the user ran
 *                            this session, or empty cards if nothing yet).
 *                            This is the page's transient state during a
 *                            live run and the empty-list initial state.
 *   - `selectedId !== ""`  → the saved report's persisted summaries, or
 *                            null where the saved report didn't include
 *                            that section.
 *
 * Kept as a separate pure helper so that the state-transition logic can be
 * unit-tested without a React renderer.
 */
export interface EvaluationViewSelection {
  readonly viewingSaved: boolean;
  readonly retrieval: RetrievalSummary | null;
  readonly answer: AnswerSummary | null;
}

export function selectEvaluationView(params: {
  selectedId: string;
  liveRetrieval: RetrievalSummary | null;
  liveAnswer: AnswerSummary | null;
  loadedReport: SavedReport | null;
}): EvaluationViewSelection {
  const viewingSaved = params.selectedId !== "";
  if (!viewingSaved) {
    return {
      viewingSaved: false,
      retrieval: params.liveRetrieval,
      answer: params.liveAnswer,
    };
  }
  // While the saved report is loading (`loadedReport` is null or points to
  // a different id), fall back to empty-state cards — do NOT leak live
  // session data through, or the user would see stale numbers from their
  // session rendered under a saved-report label.
  const match =
    params.loadedReport && params.loadedReport.id === params.selectedId
      ? params.loadedReport
      : null;
  return {
    viewingSaved: true,
    retrieval: match?.retrieval ?? null,
    answer: match?.answer ?? null,
  };
}

// ── threshold tiers (match the Gradio prototype) ────────────────────────────

export function tierForRatio(value: number, green = 0.9, amber = 0.75): ThresholdTier {
  if (value >= green) return "green";
  if (value >= amber) return "amber";
  return "red";
}

export function tierForJudge(value: number): ThresholdTier {
  if (value >= 4.5) return "green";
  if (value >= 4.0) return "amber";
  return "red";
}

// ── tier → colour tokens (match spec palette exactly) ───────────────────────

export interface TierPalette {
  readonly strip: string;
  readonly value: string;
  readonly bar: string;
}

export function paletteForTier(tier: ThresholdTier): TierPalette {
  switch (tier) {
    case "green":
      return {
        strip: "bg-[#9cc9a9]",
        value: "text-[#2d4a35]",
        bar: "bg-[#9cc9a9]",
      };
    case "amber":
      return {
        strip: "bg-[#fab89a]",
        value: "text-[#8b4a2f]",
        bar: "bg-[#fab89a]",
      };
    case "red":
      return {
        strip: "bg-[#c5a0a5]",
        value: "text-[#8b3a2f]",
        bar: "bg-[#c5a0a5]",
      };
  }
}

// ── value formatting ────────────────────────────────────────────────────────

export type MetricFormat = "ratio" | "percent" | "judge";

export function formatMetric(value: number, format: MetricFormat): string {
  switch (format) {
    case "ratio":
      return value.toFixed(3);
    case "percent":
      return `${Math.round(value * 100)}%`;
    case "judge":
      return `${value.toFixed(2)}/5`;
  }
}
