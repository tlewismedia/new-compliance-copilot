"use client";

import { useRef, useState } from "react";
import { TooltipPortal } from "./tooltip-portal";

export function CitationChip({
  n,
  excerpt,
  onActivate,
}: {
  n: number;
  excerpt?: string;
  onActivate?: (n: number) => void;
}): React.JSX.Element {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const text = excerpt ? truncate(excerpt, 400) : null;

  const handleEnter = (): void => {
    if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
  };
  const handleLeave = (): void => setRect(null);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onActivate?.(n)}
        aria-label={`Open citation ${n}`}
        className="mx-[2px] inline-flex h-[18px] w-[18px] -translate-y-[1px] cursor-pointer items-center justify-center rounded-full bg-[#dfeee3] font-mono text-[10px] font-medium text-[#2d4a35] ring-1 ring-[#9cc9a9]/40 transition-all hover:bg-[#c4e0cd] hover:ring-[#9cc9a9]"
      >
        {n}
      </button>
      {rect && text && (
        <TooltipPortal>
          <span
            role="tooltip"
            className="tooltip-in pointer-events-none fixed z-[1000] w-[320px] rounded-xl bg-[#1f2a23] px-3.5 py-2.5 text-[12px] leading-relaxed text-white/95 shadow-[0_12px_32px_-8px_rgba(31,42,35,0.4)]"
            style={{
              left: rect.left + rect.width / 2,
              top: rect.top,
            }}
          >
            <span className="mb-1 block text-[9px] uppercase tracking-[0.18em] text-white/55">
              Citation {n}
            </span>
            {text}
            <span
              aria-hidden
              className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#1f2a23]"
            />
          </span>
        </TooltipPortal>
      )}
    </span>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}…`;
}
