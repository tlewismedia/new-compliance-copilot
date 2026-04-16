"use client";

import { useState } from "react";
import { CategoryBarChart } from "./category-bar-chart";
import { EvaluationSection } from "./evaluation-section";
import { MetricCard } from "./metric-card";
import {
  tierForRatio,
  type RetrievalStreamItem,
  type RetrievalSummary,
} from "./evaluation-types";
import { streamNdjson } from "./ndjson-stream";

/**
 * Retrieval-evaluation section. Triggers POST /api/evaluations/retrieval,
 * streams per-item results to update the progress indicator, and renders
 * three metric cards + a bar chart of average MRR by category when done.
 */
export function RetrievalEvaluation(): React.JSX.Element {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{
    index: number;
    total: number;
  } | null>(null);
  const [summary, setSummary] = useState<RetrievalSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    if (running) return;
    setRunning(true);
    setError(null);
    setSummary(null);
    setProgress(null);

    try {
      await streamNdjson("/api/evaluations/retrieval", (obj) => {
        const record = obj as Record<string, unknown>;
        if (record["error"] && !record["done"]) {
          setError(String(record["error"]));
          return;
        }
        if (record["done"]) {
          setSummary(record["summary"] as RetrievalSummary);
          return;
        }
        const item = record as unknown as RetrievalStreamItem;
        if (typeof item.index === "number" && typeof item.total === "number") {
          setProgress({ index: item.index, total: item.total });
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
      title="Retrieval evaluation"
      description="Runs the benchmark through production retrieval and scores MRR, nDCG and keyword coverage. Thresholds match the eval prototype."
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
              label="MRR"
              value={summary.mrr}
              tier={tierForRatio(summary.mrr)}
              format="ratio"
              hint={`Across ${summary.total} items`}
            />
            <MetricCard
              label="nDCG"
              value={summary.ndcg}
              tier={tierForRatio(summary.ndcg)}
              format="ratio"
            />
            <MetricCard
              label="Keyword coverage"
              value={summary.keywordCoverage}
              tier={tierForRatio(summary.keywordCoverage)}
              format="percent"
            />
          </div>
          <CategoryBarChart
            title="Average MRR by category"
            scale="0-1"
            format="ratio"
            tierFor="ratio"
            rows={summary.categories.map((c) => ({
              category: c.category,
              value: c.avgMrr,
              count: c.count,
            }))}
          />
        </>
      )}
    </EvaluationSection>
  );
}
