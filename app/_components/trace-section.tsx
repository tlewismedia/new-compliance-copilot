"use client";

import { useState } from "react";
import type { Citation, Retrieval } from "../../shared/types";
import { Card } from "./card";
import {
  LOGO_FONT,
  type ConfidenceTier,
  type RunMeta,
  RETRIEVE_THRESHOLD,
  EMBEDDING_MODEL,
  GENERATE_MODEL,
  citationMarkerNumber,
  formatDuration,
} from "./shared";

export function TraceSection({
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
  const [open, setOpen] = useState(false);

  return (
    <div className="pt-2" data-testid="trace">
      <div className="mb-1 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="trace-body"
          className="group inline-flex items-center gap-2 rounded-full px-1 py-1 text-left"
        >
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/70 text-[#435048] ring-1 ring-[#2d4a35]/10 transition-transform ${
              open ? "rotate-90" : ""
            }`}
            aria-hidden
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path
                d="M2.5 1.5L5.5 4L2.5 6.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span
            className="text-[20px] tracking-tight text-[#1f2a23]"
            style={LOGO_FONT}
          >
            Trace
          </span>
        </button>
        <div className="flex items-center gap-4 rounded-full bg-white/60 px-3.5 py-1.5 text-[11px] text-[#435048] ring-1 ring-[#2d4a35]/[0.08] backdrop-blur-md">
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

      <div
        id="trace-body"
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        {/*
          The overflow-hidden is needed so the grid-rows collapse animation
          clips content during the 0fr ↔ 1fr transition, but it also clips
          the <Card> shadows of the trace nodes. To let the full shadow
          render while still clipping the height animation, pad the inside
          of the clip region by enough to fit the shadow (see Card's shadow
          tokens: blur 32 / y-offset 12 / spread -8 → ~36px below, ~24px
          on the sides, ~12px above). The horizontal padding is offset with
          matching negative x-margins so the card width stays equal to the
          parent section width; the bottom padding is offset with a negative
          margin since no content follows; the top padding replaces space
          removed from the Trace header's mb (mb-4 → mb-1) so the overall
          gap between the Trace header and the first node is preserved.
        */}
        <div className="-mx-6 -mb-10 overflow-hidden px-6 pb-10 pt-3">
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
      </div>
    </div>
  );
}

// ── internal components ───────────────────────────────────────────────────

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
    <Card className="relative p-6">
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
    </Card>
  );
}

// Visual-center offset: the arrow glyph's ink is geometrically centerable in
// its 10×10 viewBox, but the arrowhead (dense stroke convergence in the lower
// half) carries more visual weight than the thin upper shaft. If we center the
// path geometrically (top/bottom padding 1.25u each), the glyph's visual
// center of mass sits BELOW y=5 and the arrow reads as floating high relative
// to the flanking lines. To compensate, we shift the path upward inside the
// viewBox — shaft y=0.5→8.0, arrowhead apex at y=4.5 — so the top padding is
// small (0.5u) and the bottom padding is larger (2.0u). The extra whitespace
// below the arrowhead balances its visual heft, placing the perceived center
// at ~y=5 between the h-3 flanking lines.
function TraceConnector(): React.JSX.Element {
  return (
    <div className="flex py-1 pl-[33px]">
      <div className="flex flex-col items-center gap-0.5">
        <div className="h-3 w-px bg-[#9cc9a9]/60" />
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M5 0.5V8M5 8L1.5 4.5M5 8L8.5 4.5"
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

function QueryNodeContent({
  query,
}: {
  query: string;
}): React.JSX.Element {
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
