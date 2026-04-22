"use client";

import { useRef, useState } from "react";
import { TooltipPortal } from "./tooltip-portal";

/**
 * Small `?` affordance that reveals a dark tooltip popover on hover or
 * keyboard focus. Visual treatment mirrors the tooltip used by the
 * `ConfidenceBadge` in `answer-card.tsx`.
 *
 * The popover is rendered into `document.body` via `TooltipPortal` and
 * positioned with `fixed` + the trigger's `getBoundingClientRect()` so
 * it escapes any ancestor `overflow: hidden` clipping (mirrors the
 * pattern used by `CitationChip`).
 *
 * The trigger is a real `<button>` so it is focusable via keyboard and
 * announces an accessible name ("Explain <metric>"). The popover carries
 * `role="tooltip"` and is shown/hidden via mouse-enter/leave and
 * focus/blur on the trigger.
 */
export function MetricTooltip({
  label,
  explanation,
}: {
  label: string;
  explanation: string;
}): React.JSX.Element {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const show = (): void => {
    if (buttonRef.current) setRect(buttonRef.current.getBoundingClientRect());
  };
  const hide = (): void => setRect(null);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Explain ${label}`}
        onFocus={show}
        onBlur={hide}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#e5ebe7] text-[10px] font-medium leading-none text-[#6b7a70] ring-1 ring-[#d4dcd7] transition-colors hover:bg-[#d4dcd7] hover:text-[#26302a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6b7a70]"
      >
        ?
      </button>
      {rect && (
        <TooltipPortal>
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[1000] w-60 rounded-xl bg-[#1f2a23] px-3.5 py-2.5 text-[12px] font-normal normal-case leading-relaxed tracking-normal text-white/90 shadow-[0_8px_24px_-4px_rgba(31,42,35,0.4)]"
            style={{
              left: rect.left,
              top: rect.bottom + 8,
            }}
          >
            <span className="mb-1 block text-[9px] uppercase tracking-[0.18em] text-white/50">
              {label}
            </span>
            {explanation}
          </span>
        </TooltipPortal>
      )}
    </span>
  );
}
