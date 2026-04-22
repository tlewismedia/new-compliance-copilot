"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Citation, QueryResponse } from "../../shared/types";
import {
  confidenceTier,
  shortHex,
  citationMarkerNumber,
} from "../_components/shared";
import { Card } from "../_components/card";
import { QuestionCard } from "../_components/question-card";
// TEMP_SAMPLE_QUESTIONS: Remove when issue #37 affordance is no longer needed.
import { SampleQuestions } from "../_components/sample-questions";
import { AnswerCard } from "../_components/answer-card";
import { TraceSection } from "../_components/trace-section";
import { CitationsPanel } from "../_components/citations-panel";
import type { RunMeta } from "../_components/shared";
import { appendHistory } from "../_components/history-store";
import { FlockLoader } from "../_components/FlockLoader";

export function DashboardPage(): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [runMeta, setRunMeta] = useState<RunMeta | null>(null);
  const [submittedQuery, setSubmittedQuery] = useState<string>("");
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(
    null,
  );
  const [pulseKey, setPulseKey] = useState(0);

  const textareaRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    const startedAt = Date.now();
    const startedAtIso = new Date(startedAt).toISOString();
    const askedQuery = query;
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: askedQuery }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Something went wrong.");
        return;
      }
      setResult(data as QueryResponse);
      appendHistory({
        askedAt: startedAtIso,
        query: askedQuery,
        response: data as QueryResponse,
      });
      setSubmittedQuery(askedQuery);
      setRunMeta({
        run: shortHex(),
        when: startedAtIso,
        durationMs: Date.now() - startedAt,
      });
      setHighlightedChunkId(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  function handleCitationClick(n: number) {
    const chunkId = chunkIdForMarker(n, result?.citations ?? []);
    if (!chunkId) return;
    setHighlightedChunkId(chunkId);
    setPulseKey((k) => k + 1);
  }

  const tier = useMemo(
    () => confidenceTier(result?.retrievals ?? []),
    [result],
  );

  return (
    <main className="relative flex min-w-0 flex-1 items-stretch justify-center gap-8 px-8 pb-24 pt-4">
      <FlockLoader active={loading} />
      <section className="flex w-full min-w-0 max-w-[700px] flex-col justify-center">
        <div className="space-y-2">
          <QuestionCard
            query={query}
            setQuery={setQuery}
            onSubmit={() => void handleSubmit()}
            onKeyDown={handleKeyDown}
            loading={loading}
            textareaRef={textareaRef}
          />

          {/* TEMP_SAMPLE_QUESTIONS: Remove when issue #37 affordance is no longer needed. */}
          <SampleQuestions
            onSelect={(q) => {
              setQuery(q);
              textareaRef.current?.focus();
            }}
          />
        </div>

        {error && (
          <Card className="p-5 text-[13px] text-[#8b3a2f]">{error}</Card>
        )}

        {result && (
          <AnswerCard
            answer={result.answer}
            citations={result.citations}
            retrievals={result.retrievals}
            tier={tier}
            onCitationClick={handleCitationClick}
          />
        )}

        {result && runMeta && (
          <TraceSection
            runMeta={runMeta}
            query={submittedQuery}
            retrievals={result.retrievals}
            citations={result.citations}
            tier={tier}
          />
        )}
      </section>

      <CitationsPanel
        result={result}
        open={!!result}
        onClose={() => {}}
        highlightedChunkId={highlightedChunkId}
        pulseKey={pulseKey}
      />
    </main>
  );
}

function chunkIdForMarker(
  n: number,
  citations: readonly Citation[],
): string | null {
  for (const c of citations) {
    if (citationMarkerNumber(c.marker) === n) return c.chunkId;
  }
  return null;
}
