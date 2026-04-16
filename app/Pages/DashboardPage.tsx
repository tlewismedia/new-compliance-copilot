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

export function DashboardPage(): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [runMeta, setRunMeta] = useState<RunMeta | null>(null);
  const [submittedQuery, setSubmittedQuery] = useState<string>("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(
    null,
  );
  const [pulseKey, setPulseKey] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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
    setPanelOpen(true);
  }

  const tier = useMemo(
    () => confidenceTier(result?.retrievals ?? []),
    [result],
  );

  const canOpenPanel = !!result;

  return (
    <main className="relative flex min-w-0 flex-1 px-8 pb-24 pt-4">
      <div className="flex min-w-0 flex-1 gap-8">
        <section className="min-w-0 flex-1 space-y-6">
          <QuestionCard
            query={query}
            setQuery={setQuery}
            onSubmit={() => void handleSubmit()}
            onKeyDown={handleKeyDown}
            loading={loading}
            textareaRef={textareaRef}
          />

          {/* TEMP_SAMPLE_QUESTIONS: Remove when issue #37 affordance is no longer needed. */}
          <SampleQuestions />

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
          open={panelOpen && canOpenPanel}
          onClose={() => setPanelOpen(false)}
          highlightedChunkId={highlightedChunkId}
          pulseKey={pulseKey}
        />

        {!panelOpen && canOpenPanel && (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            aria-label="Open citations"
            className="sticky top-6 self-start rounded-full bg-white/80 px-3 py-2 text-[11px] font-medium text-[#2d4a35] ring-1 ring-[#9cc9a9]/40 backdrop-blur-md transition-colors hover:bg-white"
          >
            <span className="inline-flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M7.5 3L4.5 6L7.5 9"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Citations ({result?.citations.length ?? 0})
            </span>
          </button>
        )}
      </div>
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
