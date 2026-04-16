import { useMemo } from "react";
import type { Citation, Retrieval } from "../../shared/types";
import { Card } from "./card";
import {
  type ConfidenceTier,
  parseAnswerParts,
  findRetrievalForCitation,
  citationMarkerNumber,
} from "./shared";
import { CitationChip } from "./citation-chip";
import { ConfidenceBadge } from "./confidence-badge";
import { SourcesRow } from "./sources-row";

export function AnswerCard({
  answer,
  citations,
  retrievals,
  tier,
  onCitationClick,
}: {
  answer: string;
  citations: readonly Citation[];
  retrievals: readonly Retrieval[];
  tier: ConfidenceTier;
  onCitationClick?: (n: number) => void;
}): React.JSX.Element {
  const parts = useMemo(() => parseAnswerParts(answer), [answer]);

  const excerptByMarker = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of citations) {
      const n = citationMarkerNumber(c.marker);
      if (n === null) continue;
      const r = findRetrievalForCitation(c, retrievals);
      if (r?.text) m.set(n, r.text);
    }
    return m;
  }, [citations, retrievals]);

  return (
    <Card
      className="relative overflow-hidden p-7"
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
            <CitationChip
              key={i}
              n={part.n}
              excerpt={excerptByMarker.get(part.n)}
              onActivate={onCitationClick}
            />
          ),
        )}
      </p>

      {citations.length > 0 && (
        <SourcesRow citations={citations} retrievals={retrievals} />
      )}
    </Card>
  );
}


