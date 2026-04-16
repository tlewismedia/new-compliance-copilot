"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Citation,
  ChunkMetadata,
  QueryResponse,
  Retrieval,
} from "../shared/types";

// ── shared visual tokens ───────────────────────────────────────────────────

const SERIF = { fontFamily: "var(--font-serif)" };

const CARD =
  "rounded-2xl bg-white/80 backdrop-blur-md ring-1 ring-[#2d4a35]/[0.08] shadow-[0_2px_8px_-2px_rgba(45,74,53,0.06),0_12px_32px_-8px_rgba(45,74,53,0.08)]";

type Authority = ChunkMetadata["authority"];

const AUTHORITY_STYLES: Record<
  Authority,
  { strip: string; chip: string; label: string }
> = {
  FINRA: {
    strip: "bg-[#9cc9a9]",
    chip: "bg-[#dfeee3] text-[#2d4a35]",
    label: "FINRA",
  },
  SEC: {
    strip: "bg-[#94a3b0]",
    chip: "bg-[#e4e9ee] text-[#394956]",
    label: "SEC",
  },
  MSRB: {
    strip: "bg-[#b3a98b]",
    chip: "bg-[#ede8dc] text-[#4a4433]",
    label: "MSRB",
  },
  FinCEN: {
    strip: "bg-[#c5a0a5]",
    chip: "bg-[#efdfe2] text-[#54383d]",
    label: "FinCEN",
  },
  Kestrel: {
    strip: "bg-[#fab89a]",
    chip: "bg-[#fde4d4] text-[#8b4a2f]",
    label: "Kestrel",
  },
};

// Local fallback so unknown authorities still render rather than crash.
const NEUTRAL_AUTHORITY_STYLE = {
  strip: "bg-[#cfd4d1]",
  chip: "bg-[#e9ece9] text-[#435048]",
  label: "Source",
};

function authorityStyle(
  authority: Authority | undefined,
): { strip: string; chip: string; label: string } {
  if (authority && AUTHORITY_STYLES[authority]) return AUTHORITY_STYLES[authority];
  return NEUTRAL_AUTHORITY_STYLE;
}

// Pipeline knobs surfaced in the trace. Keep in sync with pipeline/nodes/retrieve.ts.
const RETRIEVE_THRESHOLD = 0.35;
const EMBEDDING_MODEL = "text-embedding-3-small";
const GENERATE_MODEL = "gpt-4o-mini";

// ── confidence ─────────────────────────────────────────────────────────────

type ConfidenceTier = "HIGH" | "MEDIUM" | "LOW";

function confidenceTier(retrievals: readonly Retrieval[]): ConfidenceTier {
  if (retrievals.length === 0) return "LOW";
  const top = Math.max(...retrievals.map((r) => r.score));
  if (top >= 0.8) return "HIGH";
  if (top >= 0.55) return "MEDIUM";
  return "LOW";
}

// ── inline-citation parsing ────────────────────────────────────────────────
// Generator emits [^N] markers (see pipeline/nodes/generate.ts).

type AnswerPart =
  | { kind: "text"; text: string }
  | { kind: "cite"; n: number };

function parseAnswerParts(answer: string): AnswerPart[] {
  const parts: AnswerPart[] = [];
  const regex = /\[\^(\d+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(answer)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ kind: "text", text: answer.slice(lastIndex, match.index) });
    }
    parts.push({ kind: "cite", n: parseInt(match[1], 10) });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < answer.length) {
    parts.push({ kind: "text", text: answer.slice(lastIndex) });
  }
  return parts;
}

// ── helpers ────────────────────────────────────────────────────────────────

function citationMarkerNumber(marker: string): number | null {
  const m = marker.match(/\[\^(\d+)\]/);
  return m ? parseInt(m[1], 10) : null;
}

function findRetrievalForCitation(
  citation: Citation,
  retrievals: readonly Retrieval[],
): Retrieval | undefined {
  return retrievals.find((r) => r.chunkId === citation.chunkId);
}

function shortHex(): string {
  // Avoid crypto.randomUUID in case of older runtimes; both are fine in modern Node/Edge.
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 6);
  }
  return Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, "0");
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ── page ───────────────────────────────────────────────────────────────────

interface RunMeta {
  readonly run: string;
  readonly when: string;
  readonly durationMs: number;
}

export default function HomePage(): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [runMeta, setRunMeta] = useState<RunMeta | null>(null);
  const [submittedQuery, setSubmittedQuery] = useState<string>("");

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
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter submits, Shift+Enter newline, ⌘↵ also submits.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  const tier = useMemo(
    () => confidenceTier(result?.retrievals ?? []),
    [result],
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundLayers />
      <Header />
      <main className="relative mx-auto max-w-[1360px] px-8 pb-24 pt-4">
        <div className="grid grid-cols-12 gap-8">
          <section className="col-span-12 space-y-6 lg:col-span-8">
            <QuestionCard
              query={query}
              setQuery={setQuery}
              onSubmit={() => void handleSubmit()}
              onKeyDown={handleKeyDown}
              loading={loading}
              textareaRef={textareaRef}
            />

            {error && (
              <div className={`${CARD} p-5 text-[13px] text-[#8b3a2f]`}>
                {error}
              </div>
            )}

            {result && (
              <AnswerCard
                answer={result.answer}
                citations={result.citations}
                retrievals={result.retrievals}
                tier={tier}
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

          <aside className="col-span-12 lg:col-span-4">
            <CitationsPanel result={result} />
          </aside>
        </div>
      </main>
    </div>
  );
}

// ── background ─────────────────────────────────────────────────────────────

function BackgroundLayers(): React.JSX.Element {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20"
        style={{
          background:
            "linear-gradient(180deg, #f6faf5 0%, #eef7f0 40%, #e8f3ea 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 900px 520px at 92% -8%, rgba(253,228,212,0.9) 0%, rgba(253,228,212,0) 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 700px 400px at -5% 110%, rgba(156,201,169,0.4) 0%, rgba(156,201,169,0) 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #2d4a35 1px, transparent 1px), linear-gradient(to bottom, #2d4a35 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
    </>
  );
}

// ── header ─────────────────────────────────────────────────────────────────

function Header(): React.JSX.Element {
  const indexName =
    process.env.NEXT_PUBLIC_PINECONE_INDEX ?? "compliance-copilot";
  return (
    <header className="relative mx-auto flex max-w-[1360px] items-center justify-between px-8 pt-8">
      <div className="flex items-center gap-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-[0_2px_8px_-2px_rgba(45,74,53,0.12)] ring-1 ring-[#9cc9a9]/30">
          <LeafMark />
        </div>
        <div className="flex flex-col leading-none">
          <span
            className="text-[19px] tracking-tight text-[#1f2a23]"
            style={SERIF}
          >
            Compliance Copilot
          </span>
          <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#6b7a70]">
            Grounded · Cited · Auditable
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-[11px] text-[#435048] ring-1 ring-[#9cc9a9]/25 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#9cc9a9] opacity-70" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#6ea580]" />
          </span>
          Index: {indexName}
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[11px] font-medium text-[#435048] ring-1 ring-[#9cc9a9]/25 backdrop-blur-md">
          TL
        </div>
      </div>
    </header>
  );
}

function LeafMark({ size = 18 }: { size?: number }): React.JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path
        d="M3 14.5C3 9 7 4 13.5 3.5C14 8 11 13.5 6 14.5C5 14.7 4 14.7 3 14.5Z"
        fill="#9cc9a9"
      />
      <path
        d="M3 14.5L11 6.5"
        stroke="#2d4a35"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── question ───────────────────────────────────────────────────────────────

function QuestionCard({
  query,
  setQuery,
  onSubmit,
  onKeyDown,
  loading,
  textareaRef,
}: {
  query: string;
  setQuery: (v: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}): React.JSX.Element {
  const disabled = loading || query.trim().length === 0;
  return (
    <div className={`${CARD} p-6`} data-testid="question-card">
      <div className="flex items-center justify-between">
        <label
          htmlFor="question-input"
          className="text-[11px] uppercase tracking-[0.18em] text-[#6b7a70]"
        >
          Question
        </label>
        <span className="text-[11px] text-[#8a968f]">Press ⌘↵ to submit</span>
      </div>
      <div className="mt-3 flex items-end gap-3">
        <div className="relative flex-1">
          <textarea
            id="question-input"
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
            rows={2}
            placeholder="e.g. What are baseline requirements for cyber incident detection?"
            className="min-h-[56px] w-full resize-none rounded-xl border border-[#2d4a35]/10 bg-white px-4 py-3 text-[15px] leading-relaxed text-[#1f2a23] placeholder-[#a0a9a4] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8),0_1px_0_0_rgba(45,74,53,0.04)] focus:border-[#6ea580] focus:outline-none focus:ring-2 focus:ring-[#9cc9a9]/40 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          aria-label={loading ? "Thinking" : "Ask"}
          className="group relative overflow-hidden rounded-xl bg-[#2d4a35] px-5 py-3 text-[13px] font-medium text-white shadow-[0_2px_8px_-2px_rgba(45,74,53,0.35)] transition-all hover:bg-[#1f3526] hover:shadow-[0_4px_14px_-2px_rgba(45,74,53,0.45)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#2d4a35]"
        >
          <span className="relative flex items-center gap-2">
            {loading ? (
              <>
                <Spinner />
                Thinking…
              </>
            ) : (
              <>
                Ask
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path
                    d="M2.5 6.5H10.5M10.5 6.5L7 3M10.5 6.5L7 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

function Spinner(): React.JSX.Element {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle
        cx="8"
        cy="8"
        r="6.5"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1.5"
      />
      <path
        d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── answer ─────────────────────────────────────────────────────────────────

function AnswerCard({
  answer,
  citations,
  retrievals,
  tier,
}: {
  answer: string;
  citations: readonly Citation[];
  retrievals: readonly Retrieval[];
  tier: ConfidenceTier;
}): React.JSX.Element {
  const parts = useMemo(() => parseAnswerParts(answer), [answer]);

  return (
    <div
      className={`${CARD} relative overflow-hidden p-7`}
      data-testid="answer"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(253,228,212,0.7) 0%, rgba(253,228,212,0) 70%)",
        }}
      />

      <div className="flex items-start justify-between gap-4">
        <label className="text-[11px] uppercase tracking-[0.18em] text-[#6b7a70]">
          Answer
        </label>
        <ConfidenceBadge tier={tier} />
      </div>

      <p className="mt-4 whitespace-pre-wrap text-[15.5px] leading-[1.75] text-[#26302a]">
        {parts.map((part, i) =>
          part.kind === "text" ? (
            <span key={i}>{part.text}</span>
          ) : (
            <CitationChip key={i} n={part.n} />
          ),
        )}
      </p>

      {citations.length > 0 && (
        <div className="mt-6" data-testid="sources-row">
          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#6b7a70]">
              Sources
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-[#9cc9a9]/40 to-transparent" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {citations.map((c) => {
              const retrieval = findRetrievalForCitation(c, retrievals);
              const a = authorityStyle(retrieval?.metadata?.authority);
              const display =
                retrieval?.metadata?.citationIdDisplay ||
                retrieval?.metadata?.citationId ||
                c.chunkId;
              const n = citationMarkerNumber(c.marker);
              return (
                <span
                  key={c.chunkId}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] ${a.chip}`}
                >
                  {n !== null && (
                    <span className="font-mono text-[10px] opacity-70">
                      [{n}]
                    </span>
                  )}
                  <span className="font-semibold">{a.label}</span>
                  <span className="opacity-75">{display}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({
  tier,
}: {
  tier: ConfidenceTier;
}): React.JSX.Element {
  // HIGH/MEDIUM = peach badge; LOW = muted sage badge.
  const isPeach = tier === "HIGH" || tier === "MEDIUM";
  const label =
    tier === "HIGH" ? "High" : tier === "MEDIUM" ? "Medium" : "Low";

  if (isPeach) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-[#fde4d4]/70 px-3.5 py-2 ring-1 ring-[#fab89a]/40">
        <div className="flex flex-col items-end leading-none">
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#8b4a2f]">
            Confidence
          </span>
          <span
            className="mt-1 text-[18px] leading-none tracking-tight text-[#6b2d0e]"
            style={SERIF}
          >
            {label}
          </span>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-[#fab89a]/50">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3.5 7L6 9.5L10.5 4.5"
              stroke="#8b4a2f"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-[#dfeee3]/70 px-3.5 py-2 ring-1 ring-[#9cc9a9]/40">
      <div className="flex flex-col items-end leading-none">
        <span className="text-[9px] uppercase tracking-[0.2em] text-[#2d4a35]/70">
          Confidence
        </span>
        <span
          className="mt-1 text-[18px] leading-none tracking-tight text-[#2d4a35]"
          style={SERIF}
        >
          {label}
        </span>
      </div>
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-[#9cc9a9]/50">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 3.5V7.5M7 10V10.2"
            stroke="#2d4a35"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

function CitationChip({ n }: { n: number }): React.JSX.Element {
  return (
    <span className="mx-[2px] inline-flex h-5 min-w-[22px] -translate-y-[1px] items-center justify-center rounded-full bg-[#dfeee3] px-1.5 font-mono text-[11px] font-medium text-[#2d4a35] ring-1 ring-[#9cc9a9]/40 transition-all hover:bg-[#c4e0cd] hover:ring-[#9cc9a9]">
      {n}
    </span>
  );
}

// ── trace ──────────────────────────────────────────────────────────────────

function TraceSection({
  runMeta,
  query,
  retrievals,
  citations,
  tier,
}: {
  runMeta: RunMeta;
  query: string;
  retrievals: readonly Retrieval[];
  citations: readonly Citation[];
  tier: ConfidenceTier;
}): React.JSX.Element {
  return (
    <div className="pt-2" data-testid="trace">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <span
            className="text-[20px] tracking-tight text-[#1f2a23]"
            style={SERIF}
          >
            Trace
          </span>
          <div className="flex flex-wrap items-center gap-4 rounded-full bg-white/60 px-3.5 py-1.5 text-[11px] text-[#435048] ring-1 ring-[#2d4a35]/[0.08] backdrop-blur-md">
            <TraceMeta label="Run" value={`#${runMeta.run}`} mono />
            <span className="h-2.5 w-px bg-[#2d4a35]/15" />
            <TraceMeta label="When" value={runMeta.when} />
            <span className="h-2.5 w-px bg-[#2d4a35]/15" />
            <TraceMeta
              label="Duration"
              value={formatDuration(runMeta.durationMs)}
              mono
            />
          </div>
        </div>
      </div>

      <div className="space-y-0">
        <TraceNode label="Query" accent="sage" duration={null}>
          <QueryNodeContent query={query} />
        </TraceNode>
        <TraceConnector />
        <TraceNode label="Retrieve" accent="sage" duration={null}>
          <RetrieveNodeContent
            retrievals={retrievals}
            citations={citations}
          />
        </TraceNode>
        <TraceConnector />
        <TraceNode label="Generate" accent="peach" duration={null}>
          <GenerateNodeContent tier={tier} />
        </TraceNode>
      </div>
    </div>
  );
}

function TraceMeta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): React.JSX.Element {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[9px] uppercase tracking-[0.2em] text-[#8a968f]">
        {label}
      </span>
      <span className={mono ? "font-mono text-[11px]" : "text-[11px]"}>
        {value}
      </span>
    </span>
  );
}

function TraceNode({
  label,
  duration,
  accent,
  children,
}: {
  label: string;
  duration: string | null;
  accent: "sage" | "peach";
  children: React.ReactNode;
}): React.JSX.Element {
  const dot = accent === "sage" ? "bg-[#9cc9a9]" : "bg-[#fab89a]";
  const dotRing = accent === "sage" ? "ring-[#9cc9a9]/30" : "ring-[#fab89a]/40";
  const text = accent === "sage" ? "text-[#2d4a35]" : "text-[#8b4a2f]";
  return (
    <div className={`${CARD} relative p-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg bg-white ring-1 ${dotRing}`}
          >
            <div className={`h-2 w-2 rounded-full ${dot}`} />
          </div>
          <span
            className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${text}`}
          >
            {label}
          </span>
        </div>
        {duration && (
          <span className="font-mono text-[11px] text-[#6b7a70]">
            {duration}
          </span>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function TraceConnector(): React.JSX.Element {
  return (
    <div className="flex py-1 pl-[33px]">
      <div className="flex flex-col items-center gap-0.5">
        <div className="h-3 w-px bg-[#9cc9a9]/60" />
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M5 1V8.5M5 8.5L1.5 5M5 8.5L8.5 5"
            stroke="#6ea580"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
        <div className="h-3 w-px bg-[#9cc9a9]/60" />
      </div>
    </div>
  );
}

function QueryNodeContent({ query }: { query: string }): React.JSX.Element {
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[9px] uppercase tracking-[0.2em] text-[#8a968f]">
          Querytext
        </div>
        <div className="mt-1.5 text-[13.5px] leading-relaxed text-[#26302a]">
          {query}
        </div>
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-[0.2em] text-[#8a968f]">
          Normalized
        </div>
        <div className="mt-1.5 font-mono text-[12.5px] text-[#8a968f]">—</div>
      </div>
    </div>
  );
}

function RetrieveNodeContent({
  retrievals,
  citations,
}: {
  retrievals: readonly Retrieval[];
  citations: readonly Citation[];
}): React.JSX.Element {
  const indexName =
    process.env.NEXT_PUBLIC_PINECONE_INDEX ?? "compliance-copilot";
  const above = retrievals.filter((r) => r.score >= RETRIEVE_THRESHOLD).length;

  // Map chunkId → emitted citation marker number, for the "Cit" column.
  const markerByChunkId = new Map<string, number>();
  citations.forEach((c) => {
    const n = citationMarkerNumber(c.marker);
    if (n !== null) markerByChunkId.set(c.chunkId, n);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <MetaCell label="Index" value={indexName} mono />
        <MetaCell label="Model" value={EMBEDDING_MODEL} mono />
        <MetaCell label="k" value={String(retrievals.length)} mono />
        <MetaCell
          label="Threshold"
          value={RETRIEVE_THRESHOLD.toFixed(2)}
          mono
        />
      </div>
      <div>
        <div className="mb-2 text-[9px] uppercase tracking-[0.2em] text-[#8a968f]">
          Candidates · {retrievals.length} returned · {above} above threshold
        </div>
        <div className="overflow-hidden rounded-xl bg-gradient-to-b from-[#f6faf5]/70 to-white ring-1 ring-[#2d4a35]/[0.06]">
          <div className="grid grid-cols-[88px_1fr_72px] gap-3 border-b border-[#2d4a35]/[0.06] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[#8a968f]">
            <span>Score</span>
            <span>ID</span>
            <span className="text-right">Cit</span>
          </div>
          <div className="divide-y divide-[#2d4a35]/[0.05]">
            {retrievals.map((r) => {
              const isAbove = r.score >= RETRIEVE_THRESHOLD;
              const cited = markerByChunkId.get(r.chunkId) ?? null;
              const display =
                r.metadata?.citationIdDisplay ||
                r.metadata?.citationId ||
                r.chunkId;
              return (
                <div
                  key={r.chunkId}
                  className="grid grid-cols-[88px_1fr_72px] items-center gap-3 px-4 py-2.5 text-[12.5px]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isAbove ? "bg-[#6ea580]" : "bg-[#cfd4d1]"
                      }`}
                    />
                    <span
                      className={`font-mono ${
                        isAbove ? "text-[#2d4a35]" : "text-[#8a968f]"
                      }`}
                    >
                      {r.score.toFixed(2)}
                    </span>
                  </div>
                  <span
                    className={`truncate font-mono text-[11.5px] ${
                      isAbove ? "text-[#435048]" : "text-[#8a968f]"
                    }`}
                    title={display}
                  >
                    {display}
                  </span>
                  <span className="text-right">
                    {cited !== null ? (
                      <span className="inline-flex items-center rounded-full bg-[#dfeee3] px-2 py-0.5 font-mono text-[10px] font-medium text-[#2d4a35] ring-1 ring-[#9cc9a9]/40">
                        [{cited}]
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#a0a9a4]">—</span>
                    )}
                  </span>
                </div>
              );
            })}
            {retrievals.length === 0 && (
              <div className="px-4 py-3 text-[12px] text-[#8a968f]">
                No candidates returned.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GenerateNodeContent({
  tier,
}: {
  tier: ConfidenceTier;
}): React.JSX.Element {
  const tierLabel =
    tier === "HIGH" ? "HIGH" : tier === "MEDIUM" ? "MEDIUM" : "LOW";
  // Per spec: token counts + citations-resolved are placeholders pending trace wiring.
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
        <MetaCell label="Model" value={GENERATE_MODEL} mono />
        <MetaCell label="Temperature" value="—" mono />
        <MetaCell
          label="Confidence"
          value={tierLabel}
          highlight={tier === "LOW" ? "sage" : "peach"}
        />
        <MetaCell label="Prompt tokens" value="—" mono />
        <MetaCell label="Completion tokens" value="—" mono />
        <MetaCell label="Citations resolved" value="—" mono />
      </div>
      <p className="text-[10.5px] italic text-[#8a968f]">
        Token counts and resolved-citation totals pending trace wiring.
      </p>
    </div>
  );
}

function MetaCell({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: "sage" | "peach";
}): React.JSX.Element {
  const base = mono ? "font-mono text-[12px]" : "text-[13px] font-medium";
  const pill =
    highlight === "peach"
      ? "inline-flex w-fit items-center gap-1.5 rounded-full bg-[#fde4d4]/70 px-2.5 py-0.5 text-[11px] text-[#8b4a2f] ring-1 ring-[#fab89a]/40"
      : highlight === "sage"
        ? "inline-flex w-fit items-center gap-1.5 rounded-full bg-[#dfeee3] px-2.5 py-0.5 font-mono text-[11px] text-[#2d4a35] ring-1 ring-[#9cc9a9]/40"
        : "";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] uppercase tracking-[0.2em] text-[#8a968f]">
        {label}
      </span>
      <span className={highlight ? pill : `${base} text-[#2d4a35]`}>
        {highlight === "peach" && (
          <span className="h-1.5 w-1.5 rounded-full bg-[#e89472]" />
        )}
        {highlight === "sage" && (
          <span className="h-1.5 w-1.5 rounded-full bg-[#6ea580]" />
        )}
        {value}
      </span>
    </div>
  );
}

// ── citations panel ────────────────────────────────────────────────────────

function CitationsPanel({
  result,
}: {
  result: QueryResponse | null;
}): React.JSX.Element {
  if (!result) {
    return (
      <div className="lg:sticky lg:top-8" data-testid="citations-empty">
        <div className="flex items-end justify-between px-1">
          <div className="flex items-baseline gap-2">
            <span
              className="text-[20px] tracking-tight text-[#1f2a23]"
              style={SERIF}
            >
              Citations
            </span>
          </div>
        </div>
        <div
          className={`mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#9cc9a9]/50 bg-white/40 px-6 py-10 text-center backdrop-blur-md`}
        >
          <LeafMark size={26} />
          <p className="mt-3 max-w-[220px] text-[12.5px] leading-relaxed text-[#6b7a70]">
            Citations will appear here once you ask a question.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:sticky lg:top-8" data-testid="citations">
      <div className="flex items-end justify-between px-1">
        <div className="flex items-baseline gap-2">
          <span
            className="text-[20px] tracking-tight text-[#1f2a23]"
            style={SERIF}
          >
            Citations
          </span>
          <span className="text-[12px] text-[#6b7a70]">
            ({result.citations.length})
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#8a968f]">
          Grounded
        </span>
      </div>
      <div className="space-y-3">
        {result.citations.map((c) => {
          const retrieval = findRetrievalForCitation(c, result.retrievals);
          return (
            <CitationCard
              key={c.chunkId}
              citation={c}
              retrieval={retrieval}
            />
          );
        })}
        {result.citations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#9cc9a9]/50 bg-white/40 px-5 py-6 text-[12.5px] text-[#6b7a70] backdrop-blur-md">
            The model returned no inline citations for this answer.
          </div>
        )}
      </div>
    </div>
  );
}

function CitationCard({
  citation,
  retrieval,
}: {
  citation: Citation;
  retrieval: Retrieval | undefined;
}): React.JSX.Element {
  const a = authorityStyle(retrieval?.metadata?.authority);
  const n = citationMarkerNumber(citation.marker);
  const display =
    retrieval?.metadata?.citationIdDisplay ||
    retrieval?.metadata?.citationId ||
    citation.chunkId;
  const score = retrieval?.score;
  const version = retrieval?.metadata?.versionStatus;
  const date = retrieval?.metadata?.effectiveDate;
  const excerptSrc = retrieval?.text ?? "";
  const excerpt =
    excerptSrc.length > 240 ? `${excerptSrc.slice(0, 240).trimEnd()}…` : excerptSrc;
  const sourceUrl = retrieval?.metadata?.sourceUrl;

  return (
    <article className={`${CARD} group relative overflow-hidden p-5`}>
      <div className={`absolute inset-y-0 left-0 w-1 ${a.strip}`} />
      <div className="pl-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {n !== null && (
              <span className="inline-flex h-6 min-w-[26px] items-center justify-center rounded-full bg-[#2d4a35] px-2 font-mono text-[11px] font-medium text-white">
                {n}
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] ${a.chip}`}
            >
              {a.label}
            </span>
          </div>
          {typeof score === "number" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 font-mono text-[10.5px] ring-1 ring-[#2d4a35]/10">
              <span className="h-1 w-1 rounded-full bg-[#6ea580]" />
              {score.toFixed(2)}
            </span>
          )}
        </div>
        <div className="mt-2.5 break-all font-mono text-[11.5px] text-[#435048]">
          {display}
        </div>
        {(version || date) && (
          <div className="mt-1 flex items-center gap-2 text-[10.5px] text-[#8a968f]">
            {version && (
              <span className="inline-flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-[#9cc9a9]" />
                <span className="capitalize">{version}</span>
              </span>
            )}
            {version && date && <span>·</span>}
            {date && <span>Effective {date}</span>}
          </div>
        )}
        {excerpt && (
          <p className="mt-3 text-[12.5px] leading-relaxed text-[#3a4540]">
            &ldquo;{excerpt}&rdquo;
          </p>
        )}
        {sourceUrl && (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-[#2d4a35] transition-colors hover:text-[#6ea580]"
          >
            Open source
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M3 7L7 3M7 3H4M7 3V6"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        )}
      </div>
    </article>
  );
}
