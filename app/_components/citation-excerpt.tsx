"use client";

import { useEffect, useRef, useState } from "react";

export function CitationExcerpt({
  text,
}: {
  text: string;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const paraRef = useRef<HTMLParagraphElement | null>(null);

  // Detect whether the excerpt actually overflows three lines at the
  // current card width. We measure only in the collapsed state — that's
  // when line-clamp-3 is active and scrollHeight exceeds clientHeight if
  // the content is truncated. Once we know the content overflows, the
  // "Show less" button must remain visible while expanded.
  useEffect(() => {
    if (expanded) return;
    const el = paraRef.current;
    if (!el) return;

    function measure(): void {
      if (!el) return;
      setIsTruncated(el.scrollHeight - el.clientHeight > 1);
    }

    measure();

    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, expanded]);

  return (
    <div className="mt-3">
      {/* line-clamp-3 when collapsed preserves any inline markup (e.g.
          match highlights) because it clamps at the CSS layer rather
          than truncating the source string. */}
      <p
        ref={paraRef}
        className={`text-[12.5px] leading-relaxed text-[#3a4540] ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        &ldquo;{text}&rdquo;
      </p>
      {isTruncated && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="mt-1.5 inline-flex items-center text-[11.5px] font-medium text-[#2d4a35] transition-colors hover:text-[#6ea580]"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
