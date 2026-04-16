import type { Citation, Retrieval } from "../../shared/types";
import { Card } from "./card";
import { CitationExcerpt } from "./citation-excerpt";
import { authorityStyle, citationMarkerNumber } from "./shared";

export function CitationCard({
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
  const excerpt = retrieval?.text ?? "";
  const sourceUrl = retrieval?.metadata?.sourceUrl;

  return (
    <Card as="article" className="group relative overflow-hidden p-5">
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
        {excerpt && <CitationExcerpt text={excerpt} />}
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
    </Card>
  );
}
