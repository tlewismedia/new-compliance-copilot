"use client";

import { useState } from "react";
import { CategoryBarChart } from "./category-bar-chart";
import { EvaluationSection } from "./evaluation-section";
import { MetricCard } from "./metric-card";
import {
  tierForJudge,
  type AnswerStreamItem,
  type AnswerSummary,
} from "./evaluation-types";
import { streamNdjson } from "./ndjson-stream";

/**
 * Answer-evaluation section. Triggers POST /api/evaluations/answer, streams
 * per-item judge scores for the progress indicator, and renders accuracy /
 * completeness / relevance cards plus a category bar chart when complete.
 */
export function AnswerEvaluation(): React.JSX.Element {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{
    index: number;
    total: number;
  } | null>(null);
  const [summary, setSummary] = useState<AnswerSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    if (running) return;
    setRunning(true);
    setError(null);
    setSummary(null);
    setProgress(null);

    try {
      await streamNdjson("/api/evaluations/answer", (obj) => {
        const record = obj as Record<string, unknown>;
        if (record["error"] && !record["done"] && !("index" in record)) {
          setError(String(record["error"]));
          return;
        }
        if (record["done"]) {
          setSummary(record["summary"] as AnswerSummary);
          return;
        }
        const item = record as unknown as AnswerStreamItem;
        if (typeof item.total === "number") {
          // Server fires items in parallel, so item.index arrives out of
          // order. Count completions locally for a monotonic counter.
          setProgress((prev) => ({
            index: (prev?.index ?? 0) + 1,
            total: item.total,
          }));
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed.");
    } finally {
      setRunning(false);
    }
  }

  const hasResults = summary !== null;

  return (
    <EvaluationSection
      title="Answer evaluation"
      description="Runs the benchmark through the full pipeline and uses an LLM-as-judge to score accuracy, completeness and relevance on a 1–5 scale."
      running={running}
      progress={progress}
      hasResults={hasResults}
      error={error}
      onRun={() => void handleRun()}
    >
      {summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label="Accuracy"
              value={summary.accuracy}
              tier={tierForJudge(summary.accuracy)}
              format="judge"
              hint={`Across ${summary.total} items`}
            />
            <MetricCard
              label="Completeness"
              value={summary.completeness}
              tier={tierForJudge(summary.completeness)}
              format="judge"
            />
            <MetricCard
              label="Relevance"
              value={summary.relevance}
              tier={tierForJudge(summary.relevance)}
              format="judge"
            />
          </div>
          <CategoryBarChart
            title="Average accuracy by category"
            scale="1-5"
            format="judge"
            tierFor="judge"
            rows={summary.categories.map((c) => ({
              category: c.category,
              value: c.avgAccuracy,
              count: c.count,
            }))}
          />
        </>
      )}
    </EvaluationSection>
  );
}
