"use client";

import { useEffect, useState } from "react";
import { AnswerEvaluation } from "../_components/answer-evaluation";
import { ReportSelector } from "../_components/report-selector";
import { RetrievalEvaluation } from "../_components/retrieval-evaluation";
import { SaveReportButton } from "../_components/save-report-button";
import { LOGO_FONT } from "../_components/shared";
import { streamNdjson } from "../_components/ndjson-stream";
import {
  selectEvaluationView,
  type AnswerStreamItem,
  type AnswerSummary,
  type RetrievalStreamItem,
  type RetrievalSummary,
  type SavedReport,
  type SavedReportMeta,
} from "../_components/evaluation-types";

/**
 * `/evaluations` page. Owns:
 *   - the "live session" state for the two evaluation sections (running
 *     flags, progress counters, summaries, errors),
 *   - the list of saved reports and which one is currently selected
 *     (`""` = live session, any id = a saved report).
 *
 * When a saved report is selected, the two sections render the persisted
 * summaries and their `Run evaluation` buttons are disabled with a tooltip.
 * Selecting `Current` restores the live session state — we never replace
 * the live state in place, so the user can always toggle back and see
 * whatever they ran this session.
 */
export function EvaluationsPage(): React.JSX.Element {
  // ── live session state ────────────────────────────────────────────────
  const [retrievalRunning, setRetrievalRunning] = useState(false);
  const [retrievalProgress, setRetrievalProgress] = useState<{
    index: number;
    total: number;
  } | null>(null);
  const [retrievalSummary, setRetrievalSummary] =
    useState<RetrievalSummary | null>(null);
  const [retrievalError, setRetrievalError] = useState<string | null>(null);

  const [answerRunning, setAnswerRunning] = useState(false);
  const [answerProgress, setAnswerProgress] = useState<{
    index: number;
    total: number;
  } | null>(null);
  const [answerSummary, setAnswerSummary] = useState<AnswerSummary | null>(
    null,
  );
  const [answerError, setAnswerError] = useState<string | null>(null);

  // ── saved-report state ────────────────────────────────────────────────
  const [savedReports, setSavedReports] = useState<readonly SavedReportMeta[]>(
    [],
  );
  const [selectedId, setSelectedId] = useState<string>(""); // "" = Current
  const [loadedReport, setLoadedReport] = useState<SavedReport | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch the saved-report list on mount so the dropdown is populated.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/evaluations/reports");
        if (!res.ok) return;
        const body = (await res.json()) as { reports: SavedReportMeta[] };
        if (!cancelled) setSavedReports(body.reports ?? []);
      } catch {
        // List failure is non-fatal: the user can still run evaluations.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the full report when the user picks a saved id from the dropdown.
  useEffect(() => {
    if (selectedId === "") {
      setLoadedReport(null);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoadError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/evaluations/reports/${encodeURIComponent(selectedId)}`,
        );
        if (!res.ok) {
          if (!cancelled) setLoadError(`Failed to load report (${res.status})`);
          return;
        }
        const body = (await res.json()) as SavedReport;
        if (!cancelled) setLoadedReport(body);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load report");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // ── run handlers (only fire when viewing `Current`) ───────────────────
  async function handleRunRetrieval() {
    if (retrievalRunning) return;
    setRetrievalRunning(true);
    setRetrievalError(null);
    setRetrievalSummary(null);
    setRetrievalProgress(null);
    try {
      await streamNdjson("/api/evaluations/retrieval", (obj) => {
        const record = obj as Record<string, unknown>;
        if (record["error"] && !record["done"]) {
          setRetrievalError(String(record["error"]));
          return;
        }
        if (record["done"]) {
          setRetrievalSummary(record["summary"] as RetrievalSummary);
          return;
        }
        const item = record as unknown as RetrievalStreamItem;
        if (typeof item.total === "number") {
          // Server fires Pinecone queries in parallel, so item.index arrives
          // out of order. Count completions locally for a monotonic counter.
          setRetrievalProgress((prev) => ({
            index: (prev?.index ?? 0) + 1,
            total: item.total,
          }));
        }
      });
    } catch (err) {
      setRetrievalError(err instanceof Error ? err.message : "Evaluation failed.");
    } finally {
      setRetrievalRunning(false);
    }
  }

  async function handleRunAnswer() {
    if (answerRunning) return;
    setAnswerRunning(true);
    setAnswerError(null);
    setAnswerSummary(null);
    setAnswerProgress(null);
    try {
      await streamNdjson("/api/evaluations/answer", (obj) => {
        const record = obj as Record<string, unknown>;
        if (record["error"] && !record["done"] && !("index" in record)) {
          setAnswerError(String(record["error"]));
          return;
        }
        if (record["done"]) {
          setAnswerSummary(record["summary"] as AnswerSummary);
          return;
        }
        const item = record as unknown as AnswerStreamItem;
        if (typeof item.total === "number") {
          // Server fires items in parallel, so item.index arrives out of
          // order. Count completions locally for a monotonic counter.
          setAnswerProgress((prev) => ({
            index: (prev?.index ?? 0) + 1,
            total: item.total,
          }));
        }
      });
    } catch (err) {
      setAnswerError(err instanceof Error ? err.message : "Evaluation failed.");
    } finally {
      setAnswerRunning(false);
    }
  }

  // ── save handler ──────────────────────────────────────────────────────
  async function handleSave() {
    if (saving) return;
    if (retrievalSummary === null && answerSummary === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/evaluations/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retrieval: retrievalSummary,
          answer: answerSummary,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
      const meta = (await res.json()) as SavedReportMeta;
      setSavedReports((prev) => [meta, ...prev]);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  // ── derive the props each section gets ────────────────────────────────
  const view = selectEvaluationView({
    selectedId,
    liveRetrieval: retrievalSummary,
    liveAnswer: answerSummary,
    loadedReport,
  });
  const viewingSaved = view.viewingSaved;
  const runDisabledReason = viewingSaved ? "Viewing a saved report" : undefined;
  const retrievalShown = view.retrieval;
  const answerShown = view.answer;

  const hasAnyLiveSummary =
    retrievalSummary !== null || answerSummary !== null;
  const showSaveButton = !viewingSaved;

  return (
    <main className="relative mx-auto w-full max-w-[1360px] flex-1 px-8 pb-24 pt-4">
      <div className="mb-6">
        <h1
          className="text-[28px] tracking-tight text-[#1f2a23]"
          style={LOGO_FONT}
        >
          Evaluations
        </h1>
        <p className="mt-1 text-[13px] text-[#6b7a70]">
          Track answer quality across regression suites and ad-hoc probes.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <ReportSelector
          value={selectedId}
          reports={savedReports}
          onChange={setSelectedId}
        />
        {showSaveButton && (
          <SaveReportButton
            onClick={() => void handleSave()}
            disabled={!hasAnyLiveSummary}
            saving={saving}
          />
        )}
      </div>

      {(loadError || saveError) && (
        <div className="mb-4 rounded-xl border border-[#c5a0a5]/40 bg-[#efdfe2]/40 px-4 py-2.5 text-[12px] text-[#8b3a2f]">
          {loadError ?? saveError}
        </div>
      )}

      <div className="space-y-8">
        <RetrievalEvaluation
          running={viewingSaved ? false : retrievalRunning}
          progress={viewingSaved ? null : retrievalProgress}
          summary={retrievalShown}
          error={viewingSaved ? null : retrievalError}
          onRun={() => void handleRunRetrieval()}
          runDisabled={viewingSaved}
          runDisabledReason={runDisabledReason}
        />
        <AnswerEvaluation
          running={viewingSaved ? false : answerRunning}
          progress={viewingSaved ? null : answerProgress}
          summary={answerShown}
          error={viewingSaved ? null : answerError}
          onRun={() => void handleRunAnswer()}
          runDisabled={viewingSaved}
          runDisabledReason={runDisabledReason}
        />
      </div>
    </main>
  );
}
