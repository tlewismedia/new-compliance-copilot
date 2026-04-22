"use client";

import { useEffect, useRef } from "react";
import type { QueryResponse } from "../../shared/types";
import { CitationCard } from "./citation-card";
import {
  LOGO_FONT,
  citationMarkerNumber,
  findRetrievalForCitation,
} from "./shared";

export function CitationsPanel({
  result,
  open,
  onClose,
  highlightedChunkId,
  pulseKey,
}: {
  result: QueryResponse | null;
  open: boolean;
  onClose: () => void;
  highlightedChunkId: string | null;
  pulseKey: number;
}): React.JSX.Element {
  return (
    <aside
      aria-hidden={!open}
      className={`shrink-0 overflow-hidden transition-[width,opacity] duration-300 ease-out ${
        open ? "w-[320px] opacity-100" : "w-0 opacity-0"
      }`}
      data-testid="citations-panel"
    >
      <div className="w-[320px] space-y-4 pr-1">
        <div className="flex items-end justify-between px-1">
          <div className="flex items-baseline gap-2">
            <span
              className="text-[20px] tracking-tight text-[#1f2a23]"
              style={LOGO_FONT}
            >
              Citations
            </span>
            {result && (
              <span className="text-[12px] text-[#6b7a70]">
                ({result.citations.length})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close citations"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/70 text-[#435048] ring-1 ring-[#2d4a35]/10 transition-colors hover:bg-white"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 3L9 9M9 3L3 9"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        {!result && (
          <div className="rounded-2xl border border-dashed border-[#9cc9a9]/50 bg-white/40 px-5 py-6 text-[12.5px] text-[#6b7a70] backdrop-blur-md">
            Citations will appear here once you ask a question.
          </div>
        )}
        {result && (
          <div className="space-y-3">
            {result.citations.map((c) => {
              const retrieval = findRetrievalForCitation(c, result.retrievals);
              const n = citationMarkerNumber(c.marker);
              return (
                <CitationCardWithHighlight
                  key={c.chunkId}
                  citation={c}
                  retrieval={retrieval}
                  highlighted={c.chunkId === highlightedChunkId}
                  pulseKey={pulseKey}
                  markerNumber={n}
                />
              );
            })}
            {result.citations.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#9cc9a9]/50 bg-white/40 px-5 py-6 text-[12.5px] text-[#6b7a70] backdrop-blur-md">
                The model returned no inline citations for this answer.
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function CitationCardWithHighlight({
  citation,
  retrieval,
  highlighted,
  pulseKey,
  markerNumber,
}: {
  citation: Parameters<typeof CitationCard>[0]["citation"];
  retrieval: Parameters<typeof CitationCard>[0]["retrieval"];
  highlighted: boolean;
  pulseKey: number;
  markerNumber: number | null;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!highlighted || !ref.current) return;
    const el = ref.current;
    el.classList.remove("citation-swell");
    void el.offsetWidth;
    el.classList.add("citation-swell");
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlighted, pulseKey]);

  return (
    <div
      ref={ref}
      data-citation-n={markerNumber ?? undefined}
      className="rounded-2xl"
    >
      <CitationCard citation={citation} retrieval={retrieval} />
    </div>
  );
}
