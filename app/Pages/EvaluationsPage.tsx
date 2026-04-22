"use client";

import { useEffect, useRef, useState } from "react";
import { AnswerEvaluation } from "../_components/answer-evaluation";
import { ReportSelector } from "../_components/report-selector";
import { RetrievalEvaluation } from "../_components/retrieval-evaluation";
import { SaveReportButton } from "../_components/save-report-button";
import {
  justSavedOnRunStart,
  justSavedOnSaveComplete,
} from "../_components/save-report-state";
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
 *     (`""` = no saved report selected — either no saved reports exist
 *     yet, or the user just kicked off a live run, any id = a saved
 *     report).
 *
 * On mount, after the saved-report list resolves, we auto-select the
 * latest saved report so the page renders historical data by default.
 * When the user clicks Run, `selectedId` flips to `""` so the live
 * progress + summary takes over. After a successful save, `selectedId`
 * flips to the new report's id so the dropdown highlights it.
 *
 * When a saved report is selected, the two sections render the persisted
 * summaries and their `Run evaluation` buttons are disabled with a tooltip.
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
  // "" = no saved report selected (either none exist yet, or the user is
  // mid-run / just-ran). On mount, this flips to the latest saved report's
  // id once the list fetch resolves.
  const [selectedId, setSelectedId] = useState<string>("");
  const [loadedReport, setLoadedReport] = useState<SavedReport | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // `justSaved` is the confirmation flag powering the "Report Saved" button
  // state. It flips true at the end of a successful POST and flips false the
  // moment the user kicks off a new retrieval or answer run — that way the
  // confirmation is tied to the exact payload that was saved, and any new
  // run (which produces a new summary) re-enables the button.
  const [justSaved, setJustSaved] = useState(false);

  // Refs mirroring the live-session state. The mount effect uses these to
  // decide, at the moment the saved-report list resolves, whether the user
  // has already kicked off a live run — if so, we must NOT yank `selectedId`
  // out from under them by auto-selecting the latest saved report.
  const retrievalSummaryRef = useRef(retrievalSummary);
  const answerSummaryRef = useRef(answerSummary);
  const retrievalRunningRef = useRef(retrievalRunning);
  const answerRunningRef = useRef(answerRunning);
  retrievalSummaryRef.current = retrievalSummary;
  answerSummaryRef.current = answerSummary;
  retrievalRunningRef.current = retrievalRunning;
  answerRunningRef.current = answerRunning;

  // Fetch the saved-report list on mount so the dropdown is populated, and
  // auto-select the latest entry so the page renders historical data by
  // default. If the user has somehow kicked off a live run before the list
  // resolves, leave `selectedId` alone so the live state stays visible.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/evaluations/reports");
        if (!res.ok) return;
        const body = (await res.json()) as { reports: SavedReportMeta[] };
        if (cancelled) return;
        const reports = body.reports ?? [];
        setSavedReports(reports);
        const noLiveRun =
          retrievalSummaryRef.current === null &&
          answerSummaryRef.current === null &&
          !retrievalRunningRef.current &&
          !answerRunningRef.current;
        if (reports.length > 0 && noLiveRun) {
          setSelectedId(reports[0].id);
        }
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

  // ── run handlers (only fire when no saved report is selected) ─────────
  async function handleRunRetrieval() {
    if (retrievalRunning) return;
    // Switch out of any saved-report view so the live progress + summary
    // takes over the cards.
    setSelectedId("");
    setRetrievalRunning(true);
    setRetrievalError(null);
    setRetrievalSummary(null);
    setRetrievalProgress(null);
    // A new run invalidates the previous save confirmation — the resulting
    // summary is different from whatever was persisted.
    setJustSaved(justSavedOnRunStart());
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
    // Switch out of any saved-report view so the live progress + summary
    // takes over the cards.
    setSelectedId("");
    setAnswerRunning(true);
    setAnswerError(null);
    setAnswerSummary(null);
    setAnswerProgress(null);
    // A new run invalidates the previous save confirmation — the resulting
    // summary is different from whatever was persisted.
    setJustSaved(justSavedOnRunStart());
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
      // Auto-select the freshly-saved report so the dropdown highlights it
      // and the cards switch to the persisted view.
      setSelectedId(meta.id);
      // Success path: flip the button into its "Report Saved" confirmation
      // state. This only runs if the POST returned ok and parsed cleanly.
      setJustSaved(justSavedOnSaveComplete(true));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.");
      setJustSaved(justSavedOnSaveComplete(false));
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
            saved={justSaved}
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
